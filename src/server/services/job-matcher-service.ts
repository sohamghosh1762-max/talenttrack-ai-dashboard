import { skillTaxonomyService, type ExtractedSkillEvidence } from "./skill-taxonomy.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { userRepository } from "../db/user-repository.ts";
import { NotFoundError, BadRequestError } from "../utils/errors.ts";
import type { IJob } from "../types/job-types.ts";
import type { IResume, IParsedResumeProfile } from "../types/resume-types.ts";
import type {
  JobMatchExplanation,
  MatchedSkillItem,
  MissingSkillItem,
  ScreeningFactorScores,
  ScreeningFactorWeights,
  RankedCandidateItem,
  RankedCandidatesResponse,
  ApplicantRecommendationItem,
  ApplicantJobRecommendationsResponse,
  SemanticSearchResultItem,
  SemanticSearchResponse,
} from "../types/screening-types.ts";

export const DEFAULT_SCREENING_WEIGHTS: ScreeningFactorWeights = {
  requiredSkills: 0.35,
  preferredSkills: 0.15,
  experience: 0.2,
  projects: 0.15,
  education: 0.1,
  semanticAlignment: 0.05,
};

export const SCREENING_ENGINE_VERSION = "2.5.0-hybrid";
export const SCREENING_MODEL_VERSION = "gemini-3.6-flash";

export class JobMatcherService {
  /**
   * Derives required years of experience based on job level or string requirements
   */
  public parseJobExperienceRequirement(job: IJob): number {
    if (job.experienceRequired) {
      const match = job.experienceRequired.match(/(\d+)/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    const level = String((job as any).experienceLevel || "").toUpperCase();
    if (level === "ENTRY") return 0;
    if (level === "JUNIOR") return 1;
    if (level === "MID") return 3;
    if (level === "SENIOR") return 5;
    if (level === "LEAD" || level === "PRINCIPAL" || level === "EXECUTIVE") return 8;
    return 2;
  }

  /**
   * Distinguishes mandatory required skills from secondary preferred skills in a job
   */
  public extractJobSkillRequirements(job: IJob): {
    requiredSkills: string[];
    preferredSkills: string[];
  } {
    const rawSkills = job.skills || [];
    const rawReqs = (job as any).requirements || [];

    const canonicalSkills = skillTaxonomyService.normalizeSkillList(rawSkills);
    const canonicalReqs = skillTaxonomyService.normalizeSkillList(rawReqs);

    const requiredSet = new Set<string>();
    const preferredSet = new Set<string>();

    // If both skills and requirements are specified:
    // Requirements & first 60% of skills are treated as mandatory, rest as preferred
    if (canonicalReqs.length > 0) {
      canonicalReqs.forEach((r) => requiredSet.add(r));
      canonicalSkills.forEach((s) => {
        if (!requiredSet.has(s)) {
          preferredSet.add(s);
        }
      });
    } else if (canonicalSkills.length > 0) {
      const splitIdx = Math.max(1, Math.ceil(canonicalSkills.length * 0.7));
      canonicalSkills.slice(0, splitIdx).forEach((s) => requiredSet.add(s));
      canonicalSkills.slice(splitIdx).forEach((s) => preferredSet.add(s));
    } else {
      // Fallback: extract keywords from job title and description
      const titleCanonical = skillTaxonomyService.normalizeSkillList(
        (job.title || "").split(/[\s,/]+/),
      );
      titleCanonical.forEach((s) => requiredSet.add(s));
    }

    return {
      requiredSkills: Array.from(requiredSet),
      preferredSkills: Array.from(preferredSet),
    };
  }

  /**
   * Evaluates a candidate resume against a specific job description
   * Produces fully explainable, verifiable scores with direct citations
   */
  public evaluateCandidateForJob(
    resumeOrProfileOrCandId: IResume | IParsedResumeProfile | string,
    jobOrName?: IJob | string,
    customWeightsOrProfile?: ScreeningFactorWeights | IParsedResumeProfile,
    jobIfFourArgs?: IJob,
  ): JobMatchExplanation {
    let resumeOrProfile: IResume | IParsedResumeProfile;
    let job: IJob;
    let customWeights: ScreeningFactorWeights = DEFAULT_SCREENING_WEIGHTS;

    if (jobIfFourArgs && customWeightsOrProfile && typeof resumeOrProfileOrCandId === "string") {
      resumeOrProfile = customWeightsOrProfile as IParsedResumeProfile;
      job = jobIfFourArgs;
    } else {
      resumeOrProfile = resumeOrProfileOrCandId as IResume | IParsedResumeProfile;
      job = jobOrName as IJob;
      if (customWeightsOrProfile && !("personal" in (customWeightsOrProfile as any))) {
        customWeights = customWeightsOrProfile as ScreeningFactorWeights;
      }
    }

    const profile: IParsedResumeProfile =
      "parsedProfile" in resumeOrProfile && resumeOrProfile.parsedProfile
        ? resumeOrProfile.parsedProfile
        : (resumeOrProfile as IParsedResumeProfile);

    const { requiredSkills, preferredSkills } = this.extractJobSkillRequirements(job);
    const candidateSkillsMap = skillTaxonomyService.extractSkillsWithEvidence(profile);
    const candidateExpYears = skillTaxonomyService.calculateExperienceYears(profile.experience);
    const targetExpYears = this.parseJobExperienceRequirement(job);

    const matchedSkills: MatchedSkillItem[] = [];
    const missingSkills: MissingSkillItem[] = [];

    // 1. Evaluate Required Skills
    let requiredSkillsScore = 0;
    if (requiredSkills.length === 0) {
      requiredSkillsScore = 85;
    } else {
      let matchedWeight = 0;
      for (const reqSkill of requiredSkills) {
        const evidence = candidateSkillsMap.get(reqSkill.toLowerCase());
        if (evidence) {
          // Weight evidence higher if demonstrated in employment/projects vs summary
          const categoryMultiplier =
            evidence.category === "employment"
              ? 1.0
              : evidence.category === "project"
                ? 0.9
                : evidence.category === "certification"
                  ? 0.85
                  : 0.6;

          matchedWeight += categoryMultiplier;
          matchedSkills.push({
            canonicalName: evidence.canonical,
            originalTerminology: evidence.original,
            jobRequirement: reqSkill,
            isRequired: true,
            evidence: evidence.evidence,
            evidenceCategory: evidence.category,
            section: evidence.section,
            confidence: evidence.confidence,
            verificationStatus: evidence.status,
          });
        } else {
          missingSkills.push({
            canonicalName: reqSkill,
            isRequired: true,
            status: "not_found",
            reason: `No verified evidence of "${reqSkill}" identified in resume text.`,
          });
        }
      }
      requiredSkillsScore = Math.min(
        100,
        Math.round((matchedWeight / requiredSkills.length) * 100),
      );
    }

    // 2. Evaluate Preferred Skills
    let preferredSkillsScore = 0;
    if (preferredSkills.length === 0) {
      preferredSkillsScore = 80;
    } else {
      let matchedPrefWeight = 0;
      for (const prefSkill of preferredSkills) {
        const evidence = candidateSkillsMap.get(prefSkill.toLowerCase());
        if (evidence) {
          matchedPrefWeight += evidence.category === "employment" ? 1.0 : 0.75;
          matchedSkills.push({
            canonicalName: evidence.canonical,
            originalTerminology: evidence.original,
            jobRequirement: prefSkill,
            isRequired: false,
            evidence: evidence.evidence,
            evidenceCategory: evidence.category,
            section: evidence.section,
            confidence: evidence.confidence,
            verificationStatus: evidence.status,
          });
        } else {
          missingSkills.push({
            canonicalName: prefSkill,
            isRequired: false,
            status: "not_found",
            reason: `Preferred technology "${prefSkill}" not mentioned.`,
          });
        }
      }
      preferredSkillsScore = Math.min(
        100,
        Math.round((matchedPrefWeight / preferredSkills.length) * 100),
      );
    }

    // 3. Evaluate Experience & Seniority
    let experienceScore = 50;
    if (targetExpYears <= 0) {
      experienceScore = 90;
    } else if (candidateExpYears >= targetExpYears) {
      const surplus = candidateExpYears - targetExpYears;
      experienceScore = Math.min(100, 85 + Math.min(15, surplus * 3));
    } else {
      const ratio = candidateExpYears / targetExpYears;
      experienceScore = Math.min(84, Math.max(30, Math.round(ratio * 80)));
    }

    // 4. Evaluate Projects & Applied Practical Work
    let projectsScore = 60;
    const projectCount = profile.projects?.length || 0;
    if (projectCount >= 3) {
      projectsScore = 95;
    } else if (projectCount >= 1) {
      projectsScore = 80;
    } else if ((profile.experience?.length || 0) >= 2) {
      projectsScore = 75; // Substantial career experience compensates for standalone projects
    } else {
      projectsScore = 45;
    }

    // 5. Evaluate Education & Qualifications
    let educationScore = 65;
    const eduCount = profile.education?.length || 0;
    const certCount = profile.certifications?.length || 0;
    if (eduCount > 0) educationScore += 20;
    if (certCount > 0) educationScore += 15;
    educationScore = Math.min(100, educationScore);

    // 6. Semantic & Role Alignment
    let semanticScore = 70;
    const titleTokens = (job.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !/senior|junior|lead|staff/i.test(w));
    const candidateSummaryLower = (profile.summary || "").toLowerCase();
    const hasRoleInExp = (profile.experience || []).some((e) => {
      const expRole = (e.role || "").toLowerCase();
      return titleTokens.some((tok) => expRole.includes(tok));
    });
    const hasRoleInSummary = titleTokens.some((tok) => candidateSummaryLower.includes(tok));
    if (hasRoleInExp) {
      semanticScore = 95;
    } else if (hasRoleInSummary) {
      semanticScore = 85;
    } else {
      semanticScore = 72;
    }

    const factorScores: ScreeningFactorScores = {
      requiredSkills: requiredSkillsScore,
      preferredSkills: preferredSkillsScore,
      experience: experienceScore,
      projects: projectsScore,
      education: educationScore,
      semanticAlignment: semanticScore,
    };

    // Calculate authoritative weighted overall score
    const weightedSum =
      factorScores.requiredSkills * customWeights.requiredSkills +
      factorScores.preferredSkills * customWeights.preferredSkills +
      factorScores.experience * customWeights.experience +
      factorScores.projects * customWeights.projects +
      factorScores.education * customWeights.education +
      factorScores.semanticAlignment * customWeights.semanticAlignment;

    const overallScore = Math.min(99, Math.max(25, Math.round(weightedSum)));

    let tier: "STRONG_MATCH" | "SOLID_MATCH" | "MODERATE_MATCH" | "LOW_MATCH" = "MODERATE_MATCH";
    let tierLabel = "Moderate Match";

    if (overallScore >= 85) {
      tier = "STRONG_MATCH";
      tierLabel = "Strong Match (85%+)";
    } else if (overallScore >= 72) {
      tier = "SOLID_MATCH";
      tierLabel = "Solid Match (72–84%)";
    } else if (overallScore >= 55) {
      tier = "MODERATE_MATCH";
      tierLabel = "Moderate Match (55–71%)";
    } else {
      tier = "LOW_MATCH";
      tierLabel = "Low Match (<55%)";
    }

    // Strengths (factual citations from resume)
    const strengths: string[] = [];
    const employmentMatches = matchedSkills.filter((s) => s.evidenceCategory === "employment");
    if (employmentMatches.length > 0) {
      strengths.push(
        `Demonstrated professional experience in core stack: ${employmentMatches
          .slice(0, 3)
          .map((m) => m.canonicalName)
          .join(", ")}.`,
      );
    }
    if (candidateExpYears >= targetExpYears && targetExpYears > 0) {
      strengths.push(
        `Verified experience meets or exceeds seniority expectation (${candidateExpYears} years vs ${targetExpYears}+ required).`,
      );
    }
    if (profile.certifications && profile.certifications.length > 0) {
      strengths.push(
        `Holds accredited industry credentials (${profile.certifications[0]?.name || "Certification"}).`,
      );
    }
    if (strengths.length === 0 && matchedSkills.length > 0) {
      strengths.push(
        `Directly matches key role skills: ${matchedSkills.slice(0, 3).map((m) => m.canonicalName).join(", ")}.`,
      );
    }

    // Gaps (factual comparisons to job requirements)
    const gaps: string[] = [];
    const missingRequired = missingSkills.filter((s) => s.isRequired);
    if (missingRequired.length > 0) {
      gaps.push(
        `Required skills not identified in resume: ${missingRequired
          .slice(0, 3)
          .map((m) => m.canonicalName)
          .join(", ")}.`,
      );
    }
    if (candidateExpYears < targetExpYears) {
      gaps.push(
        `Experience duration (${candidateExpYears} yrs) is below the stated job expectation (${targetExpYears} yrs).`,
      );
    }
    if (missingRequired.length === 0 && missingSkills.length > 0) {
      gaps.push(
        `Preferred secondary skills absent: ${missingSkills.slice(0, 3).map((m) => m.canonicalName).join(", ")}.`,
      );
    }

    // Limitations notice
    const limitations: string[] = [
      "AI screening is decision support only and does not replace human recruiter evaluation.",
      "Absence of a skill in resume text does not guarantee the candidate lacks competency in it.",
    ];
    const summaryOnlySkills = matchedSkills.filter((s) => s.evidenceCategory === "summary");
    if (summaryOnlySkills.length > 0) {
      limitations.push(
        `${summaryOnlySkills.length} skill(s) were listed in resume inventory without explicit project or employment context.`,
      );
    }

    return {
      candidateId: (profile.personal as any)?.id || "candidate",
      candidateName: profile.personal?.fullName || "Candidate",
      overallScore,
      tier,
      matchTier: tier,
      tierLabel,
      factorScores,
      factors: {
        ...factorScores,
        experienceScore: factorScores.experience,
        projectRelevance: factorScores.projects,
        educationQualifications: factorScores.education,
      },
      factorWeights: customWeights,
      weights: customWeights,
      matchedSkills: matchedSkills.map((m) => ({
        ...m,
        canonicalSkill: m.canonicalName,
        status: m.verificationStatus,
        evidence: [
          {
            category: m.evidenceCategory,
            evidenceText: m.evidence,
            sourceText: m.evidence,
          },
        ],
      })),
      missingSkills: missingSkills.map((m) => ({
        ...m,
        canonicalSkill: m.canonicalName,
        isMandatory: m.isRequired,
        explanation: m.reason,
      })),
      strengths,
      gaps,
      limitations,
      engineVersion: SCREENING_ENGINE_VERSION,
      modelVersion: SCREENING_MODEL_VERSION,
      timestamp: new Date().toISOString(),
      isAiGenerated: true,
      humanReviewRequired: true,
    } as any;
  }

  /**
   * Ranks candidate profiles directly for in-memory or programmatic usage
   */
  public rankCandidateProfiles(
    job: IJob,
    candidates: Array<{ id: string; name: string; email: string; profile: IParsedResumeProfile }>,
  ): RankedCandidateItem[] {
    const rankedItems: RankedCandidateItem[] = [];

    for (const cand of candidates) {
      const explanation = this.evaluateCandidateForJob(cand.profile, job);
      const topMatched = explanation.matchedSkills.slice(0, 4).map((s) => s.canonicalName);
      const topMissing = explanation.missingSkills
        .filter((s) => s.isRequired)
        .slice(0, 3)
        .map((s) => s.canonicalName);
      const expYears = skillTaxonomyService.calculateExperienceYears(cand.profile.experience);

      rankedItems.push({
        id: cand.id,
        candidateId: cand.id,
        candidateName: cand.name,
        candidateEmail: cand.email,
        overallScore: explanation.overallScore,
        matchTier: explanation.tier,
        tierLabel: explanation.tierLabel,
        rankingRationale: `Ranked with ${explanation.overallScore}% overall match (Required skills: ${explanation.factorScores.requiredSkills}%, Seniority: ${expYears} yrs).`,
        factors: (explanation as any).factors || explanation.factorScores,
        matchedSkills: topMatched,
        missingSkills: topMissing,
        topMatchedSkills: topMatched,
        topMissingSkills: topMissing,
        experienceYears: expYears,
        topStrengths: explanation.strengths.slice(0, 3),
        factorScores: explanation.factorScores,
        matchedSkillsCount: topMatched.length,
        missingSkillsCount: topMissing.length,
        currentStage: "NEW",
        appliedAt: new Date().toISOString(),
        humanReviewed: false,
        recruiterNotesCount: 0,
        explanation,
        rank: 0,
        applicationStage: "NEW",
        updatedAt: new Date().toISOString(),
      });
    }

    // Sort deterministically: overallScore desc -> requiredSkills desc -> experience desc -> candidateId asc
    rankedItems.sort((a, b) => {
      if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
      if (b.factorScores.requiredSkills !== a.factorScores.requiredSkills) return b.factorScores.requiredSkills - a.factorScores.requiredSkills;
      if (b.factorScores.experience !== a.factorScores.experience) return b.factorScores.experience - a.factorScores.experience;
      return a.candidateId.localeCompare(b.candidateId);
    });

    rankedItems.forEach((candidate, idx) => {
      candidate.rank = idx + 1;
    });

    return rankedItems;
  }

  /**
   * Ranks all candidate applications for a specific job opening
   */
  public async rankCandidatesForJob(
    jobIdOrJob: string | IJob,
    recruiterIdOrCandidates?: string | Array<{ id: string; name: string; email: string; profile: IParsedResumeProfile }>,
    filters: { minScore?: number; search?: string; stage?: string } = {},
  ): Promise<any> {
    if (typeof jobIdOrJob === "object" || Array.isArray(recruiterIdOrCandidates)) {
      const jobObj = typeof jobIdOrJob === "object" ? (jobIdOrJob as IJob) : await jobRepository.findById(jobIdOrJob);
      const candidatesList = Array.isArray(recruiterIdOrCandidates) ? recruiterIdOrCandidates : [];
      return this.rankCandidateProfiles(jobObj!, candidatesList);
    }

    const jobId = jobIdOrJob as string;
    const recruiterId = recruiterIdOrCandidates as string | undefined;

    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundError(`Job opening with ID ${jobId} not found.`);
    }

    if (recruiterId && job.recruiterId && job.recruiterId !== recruiterId) {
      throw new BadRequestError("You are not authorized to view candidates for this job opening.");
    }

    // Fetch all applications for this job
    const appsResult = await applicationRepository.findAll({
      jobId,
      limit: 200,
      stage: filters.stage,
      search: filters.search,
    });

    const applications = appsResult.applications;
    const { requiredSkills, preferredSkills } = this.extractJobSkillRequirements(job);
    const minExp = this.parseJobExperienceRequirement(job);

    const rankedItems: RankedCandidateItem[] = [];

    for (const app of applications) {
      let resume = app.resumeId ? await resumeRepository.findById(app.resumeId) : null;
      if (!resume) {
        const applicantResumes = await resumeRepository.findByApplicantId(app.applicantId);
        resume = applicantResumes[0] || null;
      }

      // If parsedProfile exists, evaluate against job
      let explanation: JobMatchExplanation;
      let expYears = 0;

      if (resume?.parsedProfile) {
        explanation = this.evaluateCandidateForJob(resume.parsedProfile, job);
        expYears = skillTaxonomyService.calculateExperienceYears(resume.parsedProfile.experience);
      } else {
        // Fallback for applicants with basic profile
        const user = userRepository.findFullUserById(app.applicantId);
        const profile = user?.applicantProfile;
        const skills = profile?.skills || [];
        const canonicalSkills = skillTaxonomyService.normalizeSkillList(skills);

        const syntheticProfile: IParsedResumeProfile = {
          personal: {
            fullName: app.applicantName || user?.name || "Candidate",
            email: app.applicantEmail || user?.email || "",
            phone: "",
            location: "",
            linkedin: "",
            github: "",
            portfolio: "",
          },
          summary: profile?.headline || "",
          skills: canonicalSkills,
          education: [],
          experience: [],
          projects: [],
          certifications: [],
        };
        explanation = this.evaluateCandidateForJob(syntheticProfile, job);
      }

      // Check minScore filter
      if (filters.minScore !== undefined && explanation.overallScore < filters.minScore) {
        continue;
      }

      const topMatched = explanation.matchedSkills.slice(0, 4).map((s) => s.canonicalName);
      const topMissing = explanation.missingSkills
        .filter((s) => s.isRequired)
        .slice(0, 3)
        .map((s) => s.canonicalName);

      rankedItems.push({
        id: app.id,
        candidateId: app.applicantId,
        candidateName: app.applicantName || "Candidate",
        candidateEmail: app.applicantEmail || "",
        candidateHeadline: app.applicant?.headline || "Software Engineer",
        candidateLocation: app.applicant?.location || "Remote",
        candidatePhone: app.applicant?.phone || "",
        experienceYears: expYears,
        currentStage: app.currentStage || "APPLIED",
        appliedAt: app.appliedAt,
        rank: 0, // Assigned after sorting
        overallScore: explanation.overallScore,
        factorScores: explanation.factorScores,
        factors: (explanation as any).factors || explanation.factorScores,
        matchedSkillsCount: explanation.matchedSkills.length,
        missingSkillsCount: explanation.missingSkills.length,
        matchedSkills: topMatched,
        missingSkills: topMissing,
        topMatchedSkills: topMatched,
        topMissingSkills: topMissing,
        rankingRationale: "",
        explanation,
        humanReviewed: Boolean(app.stageHistory && app.stageHistory.length > 0),
        recruiterNotesCount: app.notesList?.length || 0,
      } as any);
    }

    // Sort candidates deterministically:
    // 1. Overall Match Score desc
    // 2. Required Skills Score desc
    // 3. Experience Years desc
    // 4. Applied Date asc (earlier application gets tie-breaker advantage)
    rankedItems.sort((a, b) => {
      if (b.overallScore !== a.overallScore) {
        return b.overallScore - a.overallScore;
      }
      if (b.factorScores.requiredSkills !== a.factorScores.requiredSkills) {
        return b.factorScores.requiredSkills - a.factorScores.requiredSkills;
      }
      if ((b.experienceYears || 0) !== (a.experienceYears || 0)) {
        return (b.experienceYears || 0) - (a.experienceYears || 0);
      }
      return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
    });

    // Assign rank and compute explicit ranking rationale
    rankedItems.forEach((candidate, idx) => {
      candidate.rank = idx + 1;
      const scoreDiff = idx > 0 ? rankedItems[0]!.overallScore - candidate.overallScore : 0;

      if (idx === 0) {
        candidate.rankingRationale = `Top-ranked candidate with ${candidate.overallScore}% overall match and strong required skill alignment.`;
      } else if (scoreDiff <= 5) {
        candidate.rankingRationale = `Closely matched candidate (${candidate.overallScore}% score) with equivalent technical qualifications.`;
      } else {
        const missingReq = candidate.topMissingSkills;
        if (missingReq.length > 0) {
          candidate.rankingRationale = `Positioned at rank #${candidate.rank} due to missing required competencies (${missingReq.slice(0, 2).join(", ")}).`;
        } else {
          candidate.rankingRationale = `Rank #${candidate.rank} based on relative experience duration and secondary skill coverage.`;
        }
      }
      candidate.explanation.rankingRationale = candidate.rankingRationale;
    });

    return {
      jobId: job.id,
      jobTitle: job.title,
      jobDepartment: job.department,
      totalCandidates: applications.length,
      screenedCount: rankedItems.length,
      scoringCriteria: {
        requiredSkills,
        preferredSkills,
        minExperienceYears: minExp,
        weights: DEFAULT_SCREENING_WEIGHTS,
      },
      candidates: rankedItems,
    };
  }

  /**
   * Generates actionable, grounded resume improvement recommendations for an applicant
   */
  public generateApplicantRecommendations(
    resumeOrProfile: IResume | IParsedResumeProfile,
    job: IJob,
  ): ApplicantJobRecommendationsResponse {
    const explanation = this.evaluateCandidateForJob(resumeOrProfile, job);
    const recommendations: ApplicantRecommendationItem[] = [];

    // 1. Missing required skills
    const missingRequired = explanation.missingSkills.filter((s) => s.isRequired);
    if (missingRequired.length > 0) {
      recommendations.push({
        id: "rec-missing-skills",
        category: "skill_gap",
        title: "Highlight Missing Required Technologies",
        recommendation: `This position explicitly requires ${missingRequired.slice(0, 3).map((s) => s.canonicalName).join(", ")}. If you have practical experience with these tools, explicitly highlight them in your project or employment descriptions.`,
        suggestion: `This position explicitly requires ${missingRequired.slice(0, 3).map((s) => s.canonicalName).join(", ")}. If you have practical experience with these tools, explicitly highlight them in your project or employment descriptions.`,
        justification: `The automated screening engine identified ${missingRequired.length} core job requirement(s) absent from your resume text.`,
        rationale: `The automated screening engine identified ${missingRequired.length} core job requirement(s) absent from your resume text.`,
        relevantJobRequirement: missingRequired[0]?.canonicalName,
      } as any);
    }

    // 2. Skills mentioned in summary without project/work context
    const summaryOnly = explanation.matchedSkills.filter((s) => s.evidenceCategory === "summary");
    if (summaryOnly.length > 0) {
      recommendations.push({
        id: "rec-skill-context",
        category: "projects",
        title: "Ground Skills in Project Experience",
        recommendation: `You listed ${summaryOnly.slice(0, 3).map((s) => s.canonicalName).join(", ")} in your skills section. Connect them directly to a specific work responsibility or project bullet point to provide practical proof.`,
        suggestion: `You listed ${summaryOnly.slice(0, 3).map((s) => s.canonicalName).join(", ")} in your skills section. Connect them directly to a specific work responsibility or project bullet point to provide practical proof.`,
        justification:
          "Recruiters and ATS algorithms score skills higher when verified through tangible project or employment context.",
        rationale:
          "Recruiters and ATS algorithms score skills higher when verified through tangible project or employment context.",
      } as any);
    }

    // 3. Quantifiable outcome metrics
    const profile: IParsedResumeProfile =
      "parsedProfile" in resumeOrProfile && resumeOrProfile.parsedProfile
        ? resumeOrProfile.parsedProfile
        : (resumeOrProfile as IParsedResumeProfile);

    const hasNumbers = (profile.experience || []).some((e) => {
      const desc = Array.isArray(e.description) ? e.description.join(" ") : String(e.description);
      return /\d+[%kKmM]?|\$\d+/.test(desc);
    });

    if (!hasNumbers) {
      recommendations.push({
        id: "rec-metrics",
        category: "action_impact",
        title: "Add Measurable Impact & Metrics",
        recommendation:
          "Incorporate quantifiable business impact into your work bullet points (e.g. 'reduced latency by 30%', 'scaled to 10k users', 'automated 15 test suites').",
        suggestion:
          "Incorporate quantifiable business impact into your work bullet points (e.g. 'reduced latency by 30%', 'scaled to 10k users', 'automated 15 test suites').",
        justification:
          "Screening algorithms reward concrete achievements with quantifiable metrics over generic responsibility lists.",
        rationale:
          "Screening algorithms reward concrete achievements with quantifiable metrics over generic responsibility lists.",
      } as any);
    }

    // 4. Structure & Section headers
    if (!profile.projects || profile.projects.length === 0) {
      recommendations.push({
        id: "rec-projects-section",
        category: "structure",
        title: "Add Dedicated Technical Projects Section",
        recommendation:
          "Include 2–3 notable technical projects or architecture achievements with GitHub links and technology stacks.",
        suggestion:
          "Include 2–3 notable technical projects or architecture achievements with GitHub links and technology stacks.",
        justification:
          "Dedicated technical implementation projects increase evaluation scores in technical role screenings.",
        rationale:
          "Dedicated technical implementation projects increase evaluation scores in technical role screenings.",
      } as any);
    }

    const advisoryNotice =
      "These recommendations are designed to help you accurately represent your genuine qualifications. Implementation does not guarantee interview selection.";

    return {
      jobId: job.id,
      jobTitle: job.title,
      overallMatchScore: explanation.overallScore,
      recommendations,
      isAiGenerated: true,
      disclaimer: advisoryNotice,
      advisoryNotice,
    } as any;
  }

  /**
   * Direct candidates list semantic search for testing or custom candidate sets
   */
  public searchCandidateProfilesDirect(
    query: string,
    candidates: Array<{ id: string; name: string; email: string; profile: IParsedResumeProfile }>,
    _options: { limit?: number } = {},
  ): any[] {
    if (!query || !query.trim()) return [];
    const cleanQuery = query.trim();
    const queryTokens = cleanQuery.split(/[\s,+/]+/);
    const normalizedSkills = skillTaxonomyService.normalizeSkillList(queryTokens);

    const results: any[] = [];
    for (const cand of candidates) {
      const skills = cand.profile.skills || [];
      const canonicalSkills = skillTaxonomyService.normalizeSkillList(skills);
      const allSkillsLower = new Set(canonicalSkills.map((s) => s.toLowerCase()));

      let matchScore = 0;
      const matchedTokens: string[] = [];

      for (const skill of normalizedSkills) {
        if (allSkillsLower.has(skill.toLowerCase())) {
          matchScore += 35;
          matchedTokens.push(skill);
        }
      }

      const text = `${cand.name} ${cand.profile.summary || ""} ${JSON.stringify(cand.profile.experience || "")}`.toLowerCase();
      for (const token of queryTokens) {
        if (token.length > 2 && text.includes(token.toLowerCase())) {
          matchScore += 10;
          const canon = skillTaxonomyService.canonicalizeSkill(token);
          if (canon && !matchedTokens.includes(canon)) {
            matchedTokens.push(canon);
          }
        }
      }

      if (matchedTokens.length > 0 || matchScore >= 20) {
        results.push({
          candidateId: cand.id,
          name: cand.name,
          email: cand.email,
          relevanceScore: Math.min(99, Math.max(35, matchScore)),
          matchedTokens,
          matchedKeywords: matchedTokens,
          skills: canonicalSkills,
        });
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results;
  }

  /**
   * Natural Language Semantic Candidate Search
   * Combines query intent, technology aliases, and multi-field relevance scoring
   */
  public async semanticSearchCandidates(
    query: string,
    recruiterIdOrCandidates?: string | Array<{ id: string; name: string; email: string; profile: IParsedResumeProfile }>,
    options: { limit?: number } = {},
  ): Promise<any> {
    if (Array.isArray(recruiterIdOrCandidates)) {
      return this.searchCandidateProfilesDirect(query, recruiterIdOrCandidates, options);
    }

    if (!query || !query.trim()) {
      return {
        query: "",
        normalizedSkills: [],
        totalResults: 0,
        results: [],
        model: SCREENING_MODEL_VERSION,
      };
    }

    const cleanQuery = query.trim();
    const queryTokens = cleanQuery.split(/[\s,+/]+/);
    const normalizedSkills = skillTaxonomyService.normalizeSkillList(queryTokens);

    // Retrieve active candidate applicants
    const usersResult = userRepository.findAll({ role: "APPLICANT", limit: 100 });
    const applicants = usersResult.users.filter(
      (u) => u.status?.toUpperCase() !== "DEACTIVATED",
    );

    const searchResults: SemanticSearchResultItem[] = [];
    const limit = options.limit || 20;

    for (const applicant of applicants) {
      const profile = applicant.applicantProfile || {};
      const candidateSkills = profile.skills || [];
      const canonicalCandidateSkills = skillTaxonomyService.normalizeSkillList(candidateSkills);

      // Fetch latest resume if available
      const resumes = await resumeRepository.findByApplicantId(applicant.id);
      const latestResume = resumes[0];
      const parsed = latestResume?.parsedProfile;

      if (parsed) {
        parsed.skills?.forEach((s) => canonicalCandidateSkills.push(skillTaxonomyService.canonicalizeSkill(s)));
      }

      const allSkillsLower = new Set(canonicalCandidateSkills.map((s) => s.toLowerCase()));

      let matchScore = 0;
      const matchedKeywords: string[] = [];
      const highlights: string[] = [];

      // 1. Skill overlap
      for (const skill of normalizedSkills) {
        if (allSkillsLower.has(skill.toLowerCase())) {
          matchScore += 25;
          matchedKeywords.push(skill);
        }
      }

      // 2. Query text in headline or summary
      const headline = profile.headline || "";
      const summary = parsed?.summary || "";
      const textToSearch = `${applicant.name} ${headline} ${summary} ${candidateSkills.join(" ")}`.toLowerCase();

      for (const token of queryTokens) {
        if (token.length > 2 && textToSearch.includes(token.toLowerCase())) {
          matchScore += 10;
        }
      }

      // 3. Experience check
      if (parsed?.experience && parsed.experience.length > 0) {
        matchScore += Math.min(15, parsed.experience.length * 5);
        highlights.push(`${parsed.experience[0]?.role} at ${parsed.experience[0]?.company}`);
      }

      if (matchedKeywords.length > 0 || matchScore >= 20) {
        const finalScore = Math.min(98, Math.max(35, matchScore));

        // Get count of jobs candidate applied to
        const apps = await applicationRepository.findAll({ applicantId: applicant.id, limit: 10 });

        searchResults.push({
          candidateId: applicant.id,
          name: applicant.name,
          email: applicant.email,
          headline: headline || "Software Engineer",
          location: profile.location || "Remote",
          skills: Array.from(new Set(canonicalCandidateSkills)).slice(0, 6),
          relevanceScore: finalScore,
          matchSummary: `Matches ${matchedKeywords.length} query criteria (${matchedKeywords.join(", ") || "General background"}).`,
          matchedKeywords,
          experienceHighlights: highlights,
          appliedJobsCount: apps.applications.length,
        });
      }
    }

    // Sort by relevance score descending
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const paginated = searchResults.slice(0, limit);

    return {
      query: cleanQuery,
      normalizedSkills,
      totalResults: searchResults.length,
      results: paginated,
      model: SCREENING_MODEL_VERSION,
    };
  }
}

export const jobMatcherService = new JobMatcherService();
