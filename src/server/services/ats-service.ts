import crypto from "crypto";
import { geminiService } from "./gemini-service.ts";
import {
  validateGeminiAtsAnalysis,
  GEMINI_ATS_ANALYSIS_SCHEMA,
  type ValidatedGeminiAtsOutput,
} from "../validators/ats-validator.ts";
import {
  type AtsAnalysisResult,
  type AtsCategoryKey,
  type AtsCompatibilityTier,
  ATS_CATEGORY_WEIGHTS,
  ATS_SCORING_CONFIG,
} from "../types/ats-types.ts";
import type { IResume, IParsedResumeProfile } from "../types/resume-types.ts";

export const ATS_ANALYZER_SYSTEM_INSTRUCTION = `You are a high-precision, objective ATS (Applicant Tracking System) semantic resume evaluator.
Your role is to evaluate the provided candidate resume profile for qualitative substance, role progression, keyword relevance, and demonstrated impact.

EVALUATION INSTRUCTIONS:
1. Provide qualitative scores (0-100) with concrete evidence citations based ONLY on the candidate data provided.
2. skillsRelevance: Evaluate alignment and depth of technical and domain skills.
3. experienceQuality: Evaluate career trajectory, responsibilities, and clarity.
4. projectQuality: Evaluate technical implementation projects and complexity.
5. summaryQuality: Evaluate the clarity and focus of the professional summary.
6. keywordRelevance: Assess presence and natural density of relevant industry terms.
7. achievementQuality: Assess presence of quantifiable achievements, business outcomes, and metrics.
8. strengths: 3-5 factual strengths based on the resume.
9. weaknesses: 3-5 constructive areas to improve based on the resume.
10. recommendations: 3-5 actionable suggestions to improve ATS parseability and candidate match.

CRITICAL RULES:
- Return strictly structured JSON matching the schema.
- Do NOT invent or hallucinate skills, metrics, or credentials.
- Evidence items MUST quote or refer directly to elements present in the resume.`;

/**
 * Computes a deterministic SHA-256 hash of the canonical resume profile and metadata
 */
export function computeResumeHash(
  profile: IParsedResumeProfile,
  fileName: string = "",
  fileSize: number = 0,
): string {
  const canonical = {
    fileName: fileName.trim().toLowerCase(),
    fileSize,
    personal: {
      fullName: profile.personal?.fullName?.trim() || "",
      email: profile.personal?.email?.trim().toLowerCase() || "",
      phone: profile.personal?.phone?.trim() || "",
      location: profile.personal?.location?.trim() || "",
      linkedin: profile.personal?.linkedin?.trim() || "",
      github: profile.personal?.github?.trim() || "",
      portfolio: profile.personal?.portfolio?.trim() || "",
    },
    summary: profile.summary?.trim() || "",
    skills: [...(profile.skills || [])].map((s) => s.trim().toLowerCase()).sort(),
    experience: (profile.experience || []).map((e) => ({
      company: e.company?.trim().toLowerCase() || "",
      role: e.role?.trim().toLowerCase() || "",
      startDate: e.startDate?.trim() || "",
      endDate: e.endDate?.trim() || "",
      description: Array.isArray(e.description)
        ? e.description.map((d) => d.trim()).sort()
        : [String(e.description || "").trim()],
      technologies: [...(e.technologies || [])].map((t) => t.trim().toLowerCase()).sort(),
    })),
    education: (profile.education || []).map((edu) => ({
      institution: edu.institution?.trim().toLowerCase() || "",
      degree: edu.degree?.trim().toLowerCase() || "",
      fieldOfStudy: edu.fieldOfStudy?.trim().toLowerCase() || "",
      startDate: edu.startDate?.trim() || "",
      endDate: edu.endDate?.trim() || "",
      grade: edu.grade?.trim() || "",
    })),
    certifications: (profile.certifications || []).map((c) => ({
      name: c.name?.trim().toLowerCase() || "",
      issuer: c.issuer?.trim().toLowerCase() || "",
      date: c.date?.trim() || "",
    })),
    projects: (profile.projects || []).map((p) => ({
      name: p.name?.trim().toLowerCase() || "",
      description: p.description?.trim() || "",
      technologies: [...(p.technologies || [])].map((t) => t.trim().toLowerCase()).sort(),
    })),
  };

  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/**
 * Computes a unique, deterministic analysis key representing the exact input context
 */
export function computeAnalysisKey(
  resumeHash: string,
  rubricVersion: string = ATS_SCORING_CONFIG.rubricVersion,
  engineVersion: string = ATS_SCORING_CONFIG.engineVersion,
  geminiModel: string = "gemini-3.6-flash",
  promptVersion: string = ATS_SCORING_CONFIG.promptVersion,
  jobContextHash: string = "none",
): string {
  const combined = `${resumeHash}:${rubricVersion}:${engineVersion}:${geminiModel}:${promptVersion}:${jobContextHash}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
}

export class AtsService {
  /**
   * Deterministically calculates category baseline scores directly from structured parsedProfile
   */
  public calculateDeterministicBaselines(
    profile: IParsedResumeProfile,
    jobContext?: { requiredSkills?: string[]; title?: string },
  ): Record<
    AtsCategoryKey,
    { score: number; strengths: string[]; improvements: string[]; evidence: string[] }
  > {
    const strengths: Record<AtsCategoryKey, string[]> = {
      completeness: [],
      skills: [],
      experience: [],
      keywords: [],
      education: [],
      structure: [],
    };

    const improvements: Record<AtsCategoryKey, string[]> = {
      completeness: [],
      skills: [],
      experience: [],
      keywords: [],
      education: [],
      structure: [],
    };

    const evidence: Record<AtsCategoryKey, string[]> = {
      completeness: [],
      skills: [],
      experience: [],
      keywords: [],
      education: [],
      structure: [],
    };

    // 1. Completeness evaluation (0-100)
    let completenessScore = 30;
    if (profile.personal?.fullName && profile.personal?.email) {
      completenessScore += 20;
      strengths.completeness.push("Complete candidate contact information (Name and Email)");
      evidence.completeness.push("Primary contact details provided.");
    }
    if (profile.personal?.phone) {
      completenessScore += 10;
      evidence.completeness.push("Phone contact present.");
    }
    if (profile.personal?.location) {
      completenessScore += 10;
      evidence.completeness.push("Location present.");
    }
    if (profile.personal?.linkedin || profile.personal?.github || profile.personal?.portfolio) {
      completenessScore += 10;
      strengths.completeness.push("Professional links and portfolio profiles included");
      evidence.completeness.push("Professional web presence links detected.");
    } else {
      improvements.completeness.push(
        "Add LinkedIn or portfolio links to improve contact completeness",
      );
    }
    if (profile.summary && profile.summary.trim().length > 30) {
      completenessScore += 10;
      strengths.completeness.push("Clear professional summary highlighting career focus");
      evidence.completeness.push("Substantial executive summary section present.");
    } else {
      improvements.completeness.push("Include a concise 2-3 sentence professional summary");
    }
    if (profile.experience && profile.experience.length > 0) {
      completenessScore += 5;
    }
    if (profile.education && profile.education.length > 0) {
      completenessScore += 5;
    }
    completenessScore = Math.min(100, Math.max(20, completenessScore));

    // 2. Skills evaluation (0-100)
    const skillsCount = profile.skills?.length || 0;
    let skillsScore = 40;
    if (skillsCount >= 10) {
      skillsScore = 95;
      strengths.skills.push(
        `Robust skill profile with ${skillsCount} identified core competencies`,
      );
      evidence.skills.push(`${skillsCount} technical skills extracted.`);
    } else if (skillsCount >= 6) {
      skillsScore = 84;
      strengths.skills.push(`Good technical coverage across ${skillsCount} key skills`);
      evidence.skills.push(`${skillsCount} technical skills extracted.`);
    } else if (skillsCount >= 3) {
      skillsScore = 68;
      improvements.skills.push(
        "Expand skills section with additional domain-specific tools and frameworks",
      );
      evidence.skills.push(`Only ${skillsCount} core skills identified.`);
    } else {
      skillsScore = 45;
      improvements.skills.push(
        "Add more core technical skills and tools to pass automated ATS filters",
      );
      evidence.skills.push("Minimal skills listed.");
    }

    // Job matching if context provided
    if (jobContext?.requiredSkills && jobContext.requiredSkills.length > 0) {
      const lowerProfileSkills = new Set((profile.skills || []).map((s) => s.toLowerCase()));
      const matched = jobContext.requiredSkills.filter((req) =>
        lowerProfileSkills.has(req.toLowerCase()),
      );
      const matchRatio = matched.length / jobContext.requiredSkills.length;
      skillsScore = Math.round(skillsScore * 0.6 + matchRatio * 100 * 0.4);
      evidence.skills.push(
        `Matched ${matched.length}/${jobContext.requiredSkills.length} job-specific required skills.`,
      );
    }

    // 3. Experience evaluation (0-100)
    const experienceCount = profile.experience?.length || 0;
    let experienceScore = 45;
    let hasQuantifiableMetrics = false;
    let hasTechInExp = false;

    if (experienceCount > 0) {
      experienceScore += Math.min(25, experienceCount * 12);
      for (const exp of profile.experience) {
        const descText = Array.isArray(exp.description)
          ? exp.description.join(" ")
          : String(exp.description || "");
        if (
          /\d+%|\$\d+|\b\d+\s*(?:users|clients|projects|ms|teams|engineers|requests|k|m|gb|tb)\b/i.test(
            descText,
          )
        ) {
          hasQuantifiableMetrics = true;
        }
        if (exp.technologies && exp.technologies.length > 0) {
          hasTechInExp = true;
        }
      }

      if (hasQuantifiableMetrics) {
        experienceScore += 18;
        strengths.experience.push(
          "Measurable achievements and quantifiable metrics in work experience",
        );
        evidence.experience.push(
          "Experience contains quantifiable outcome metrics (e.g. percentages, scale).",
        );
      } else {
        improvements.experience.push(
          "Incorporate quantifiable metrics and percentage outcomes in recent job roles",
        );
        evidence.experience.push("Experience lacks measurable numbers and impact metrics.");
      }

      if (hasTechInExp) {
        experienceScore += 12;
        strengths.experience.push("Technologies and tools directly linked to job roles");
        evidence.experience.push("Technologies mapped to career history.");
      }
    } else {
      experienceScore = 35;
      improvements.experience.push(
        "Detail your practical work history or substantial project experience",
      );
      evidence.experience.push("No employment history records detected.");
    }
    experienceScore = Math.min(100, Math.max(30, experienceScore));

    // 4. Keyword Coverage evaluation (0-100)
    let keywordScore = 50;
    const allKeywords = new Set<string>();
    (profile.skills || []).forEach((s) => allKeywords.add(s.toLowerCase()));
    (profile.experience || []).forEach((e) =>
      (e.technologies || []).forEach((t) => allKeywords.add(t.toLowerCase())),
    );
    (profile.projects || []).forEach((p) =>
      (p.technologies || []).forEach((t) => allKeywords.add(t.toLowerCase())),
    );

    if (allKeywords.size >= 12) {
      keywordScore = 94;
      strengths.keywords.push(
        `Strong ATS keyword density with ${allKeywords.size} distinct technical keywords`,
      );
      evidence.keywords.push(`${allKeywords.size} distinct technical keywords found.`);
    } else if (allKeywords.size >= 6) {
      keywordScore = 78;
      strengths.keywords.push("Solid keyword coverage across experience and projects");
      evidence.keywords.push(`${allKeywords.size} distinct technical keywords found.`);
    } else {
      keywordScore = 52;
      improvements.keywords.push(
        "Incorporate high-value industry terminology and technical keywords",
      );
      evidence.keywords.push("Limited industry keyword density detected.");
    }

    // 5. Education & Certifications evaluation (0-100)
    let educationScore = 55;
    const eduCount = profile.education?.length || 0;
    const certCount = profile.certifications?.length || 0;

    if (eduCount > 0) {
      educationScore += 25;
      strengths.education.push("Verified educational background and formal degree details");
      evidence.education.push(`${eduCount} formal educational qualification(s) verified.`);
    } else {
      improvements.education.push("Add formal education or degree history");
      evidence.education.push("No formal educational degrees listed.");
    }

    if (certCount > 0) {
      educationScore += 20;
      strengths.education.push(
        `Industry certifications included (${certCount} credential${certCount > 1 ? "s" : ""})`,
      );
      evidence.education.push(`${certCount} professional certification(s) listed.`);
    } else {
      improvements.education.push(
        "Consider listing professional certifications or relevant accredited training",
      );
    }
    educationScore = Math.min(100, Math.max(35, educationScore));

    // 6. Structure & Formatting evaluation (0-100)
    let structureScore = 70;
    if (
      profile.personal?.fullName &&
      profile.skills?.length &&
      (profile.experience?.length || profile.education?.length)
    ) {
      structureScore += 18;
      strengths.structure.push(
        "Well-structured document sections suitable for automated parser extraction",
      );
      evidence.structure.push("Standard chronological layout with key section headers.");
    }
    if (profile.projects && profile.projects.length > 0) {
      structureScore += 12;
      strengths.structure.push("Dedicated portfolio / project highlights section");
      evidence.structure.push(`${profile.projects.length} project highlights detected.`);
    }
    structureScore = Math.min(100, Math.max(50, structureScore));

    return {
      completeness: {
        score: completenessScore,
        strengths: strengths.completeness,
        improvements: improvements.completeness,
        evidence: evidence.completeness,
      },
      skills: {
        score: skillsScore,
        strengths: strengths.skills,
        improvements: improvements.skills,
        evidence: evidence.skills,
      },
      experience: {
        score: experienceScore,
        strengths: strengths.experience,
        improvements: improvements.experience,
        evidence: evidence.experience,
      },
      keywords: {
        score: keywordScore,
        strengths: strengths.keywords,
        improvements: improvements.keywords,
        evidence: evidence.keywords,
      },
      education: {
        score: educationScore,
        strengths: strengths.education,
        improvements: improvements.education,
        evidence: evidence.education,
      },
      structure: {
        score: structureScore,
        strengths: strengths.structure,
        improvements: improvements.structure,
        evidence: evidence.structure,
      },
    };
  }

  /**
   * Helper to determine ATS Compatibility Tier based on final score
   */
  public getCompatibilityTier(score: number): { tier: AtsCompatibilityTier; label: string } {
    if (score >= 85) {
      return { tier: "EXCELLENT", label: "Excellent ATS Compatibility" };
    }
    if (score >= 70) {
      return { tier: "GOOD", label: "Good ATS Compatibility" };
    }
    if (score >= 55) {
      return { tier: "MODERATE", label: "Moderate ATS Compatibility" };
    }
    return { tier: "NEEDS_IMPROVEMENT", label: "Needs Improvement" };
  }

  /**
   * Build deterministic AI prompt for Gemini from structured parsedProfile
   */
  public buildPrompt(
    profile: IParsedResumeProfile,
    fileName: string,
    jobContext?: { requiredSkills?: string[]; title?: string; description?: string },
  ): string {
    const jobText = jobContext
      ? `\nTarget Role: ${jobContext.title || "Not specified"}\nRequired Skills: ${(jobContext.requiredSkills || []).join(", ")}\nJob Context: ${jobContext.description || "General position"}\n`
      : "";

    return `Analyze the following candidate structured resume profile for ATS readiness, semantic skill depth, experience quality, keyword density, and qualitative impact.
${jobText}
Resume File: ${fileName}
Candidate Name: ${profile.personal?.fullName || "Not Specified"}
Email: ${profile.personal?.email || "Not Specified"}
Phone: ${profile.personal?.phone || "Not Specified"}
Location: ${profile.personal?.location || "Not Specified"}
LinkedIn: ${profile.personal?.linkedin || "None"}
GitHub/Portfolio: ${profile.personal?.github || profile.personal?.portfolio || "None"}

Professional Summary:
${profile.summary || "None provided"}

Extracted Skills:
${(profile.skills || []).join(", ") || "None listed"}

Work Experience:
${
  (profile.experience || [])
    .map(
      (e) =>
        `- ${e.role || "Role"} at ${e.company || "Company"} (${e.startDate || ""} - ${e.endDate || "Present"}):\n  ${Array.isArray(e.description) ? e.description.join("\n  ") : e.description || ""}\n  Technologies: ${(e.technologies || []).join(", ") || "None"}`,
    )
    .join("\n\n") || "No employment history listed"
}

Education:
${
  (profile.education || [])
    .map(
      (edu) =>
        `- ${edu.degree || "Degree"} in ${edu.fieldOfStudy || "Field"} from ${edu.institution || "Institution"} (${edu.startDate || ""} - ${edu.endDate || ""}, ${edu.grade || ""})`,
    )
    .join("\n") || "No formal education listed"
}

Certifications:
${
  (profile.certifications || [])
    .map((c) => `- ${c.name} (${c.issuer || ""}, ${c.date || ""})`)
    .join("\n") || "None listed"
}

Projects:
${
  (profile.projects || [])
    .map(
      (p) =>
        `- ${p.name}: ${p.description || ""} (Tech: ${(p.technologies || []).join(", ") || ""})`,
    )
    .join("\n") || "None listed"
}

Languages: ${(profile.languages || []).join(", ") || "None"}
Achievements: ${(profile.achievements || []).join(", ") || "None"}`;
  }

  /**
   * Performs full controlled hybrid ATS analysis:
   * 1. Generates cryptographic resumeHash & analysisKey
   * 2. Checks for existing cached analysis matching identical context (Idempotent: same resume = same result)
   * 3. Calculates objective deterministic baseline scores (60% weight)
   * 4. Calls Gemini AI for semantic qualitative dimensions (40% weight) with temperature: 0
   * 5. Validates structured Gemini response with Zod (bounds: 0-100)
   * 6. Fuses deterministic and Gemini scores at the category level
   * 7. Computes strictly weighted 0-100 final ATS score
   */
  public async analyzeResume(
    resume: IResume,
    options: {
      forceFresh?: boolean;
      jobContext?: { requiredSkills?: string[]; title?: string; description?: string };
    } = {},
  ): Promise<AtsAnalysisResult> {
    const profile = resume.parsedProfile;
    if (!profile) {
      throw new Error("Cannot perform ATS analysis: Resume has not been parsed yet.");
    }

    const fileName = resume.originalFileName || "Resume.pdf";
    const fileSize = resume.fileSize || 0;
    const currentModel = geminiService.getModel();

    // 1. Calculate cryptographic identity hashes
    const resumeHash = computeResumeHash(profile, fileName, fileSize);
    const jobContextHash = options.jobContext
      ? crypto.createHash("sha256").update(JSON.stringify(options.jobContext)).digest("hex")
      : "none";

    const analysisKey = computeAnalysisKey(
      resumeHash,
      ATS_SCORING_CONFIG.rubricVersion,
      ATS_SCORING_CONFIG.engineVersion,
      currentModel,
      ATS_SCORING_CONFIG.promptVersion,
      jobContextHash,
    );

    // 2. Idempotency Check: Return cached analysis if context is identical and not forced fresh
    if (!options.forceFresh && resume.atsAnalysis) {
      const existing = resume.atsAnalysis;
      if (existing.analysisKey === analysisKey || existing.resumeHash === resumeHash) {
        console.log(
          JSON.stringify({
            stage: "[ATS-DEBUG] cached-analysis-hit",
            resumeId: resume.id,
            analysisKey,
            overallScore: existing.overallScore,
          }),
        );
        return existing;
      }
    }

    console.log(
      JSON.stringify({
        stage: "[ATS-DEBUG] ats-analysis-start",
        resumeId: resume.id,
        applicantId: resume.applicantId,
        hasParsedProfile: true,
        skillsCount: profile.skills?.length || 0,
        experienceCount: profile.experience?.length || 0,
        educationCount: profile.education?.length || 0,
        summaryPresent: Boolean(profile.summary && profile.summary.trim().length > 0),
        analysisKey,
      }),
    );

    // 3. Deterministic objective evaluation
    const deterministic = this.calculateDeterministicBaselines(profile, options.jobContext);

    // 4. Gemini AI qualitative evaluation (temperature: 0 for deterministic stability)
    let aiOutput: ValidatedGeminiAtsOutput | null = null;
    let aiAvailable = false;

    if (geminiService.isConfigured()) {
      try {
        const prompt = this.buildPrompt(profile, fileName, options.jobContext);
        const rawAi = await geminiService.generateStructured<Record<string, unknown>>(prompt, {
          systemInstruction: ATS_ANALYZER_SYSTEM_INSTRUCTION,
          responseSchema: GEMINI_ATS_ANALYSIS_SCHEMA,
          temperature: 0, // Deterministic zero-temperature execution
        });

        aiOutput = validateGeminiAtsAnalysis(rawAi);
        aiAvailable = true;
      } catch (err: unknown) {
        console.warn(
          "[ATS-DEBUG] Gemini semantic evaluation fallback invoked:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    // 5. Category-Level Controlled Fusion
    // Deterministic (60%) + Gemini AI Semantic (40%)
    const detWeight = ATS_SCORING_CONFIG.deterministicWeight; // 0.60
    const aiWeight = ATS_SCORING_CONFIG.geminiWeight; // 0.40

    // Map Gemini semantic dimensions to the 6 standard ATS categories
    const geminiCategoryScores: Record<AtsCategoryKey, number> = {
      completeness: aiOutput ? aiOutput.summaryQuality.score : deterministic.completeness.score,
      skills: aiOutput ? aiOutput.skillsRelevance.score : deterministic.skills.score,
      experience: aiOutput
        ? Math.round((aiOutput.experienceQuality.score + aiOutput.achievementQuality.score) / 2)
        : deterministic.experience.score,
      keywords: aiOutput ? aiOutput.keywordRelevance.score : deterministic.keywords.score,
      education: aiOutput
        ? Math.round((aiOutput.achievementQuality.score + aiOutput.projectQuality.score) / 2)
        : deterministic.education.score,
      structure: aiOutput ? aiOutput.projectQuality.score : deterministic.structure.score,
    };

    const categoriesKeys: AtsCategoryKey[] = [
      "completeness",
      "skills",
      "experience",
      "keywords",
      "education",
      "structure",
    ];

    const finalCategories: Record<AtsCategoryKey, any> = {} as any;
    const deterministicScores: Record<AtsCategoryKey, number> = {} as any;
    const finalCategoryScores: Record<AtsCategoryKey, number> = {} as any;

    let weightedSum = 0;

    for (const key of categoriesKeys) {
      const weightInfo = ATS_CATEGORY_WEIGHTS[key];
      const detScore = deterministic[key].score;
      const gemScore = geminiCategoryScores[key];

      deterministicScores[key] = detScore;

      // Category fusion formula: (detScore * 0.60) + (gemScore * 0.40)
      const fusedScore = Math.min(
        100,
        Math.max(0, Math.round(detScore * detWeight + gemScore * aiWeight)),
      );
      finalCategoryScores[key] = fusedScore;

      // Extract evidence / feedback
      let feedback =
        deterministic[key].strengths[0] || `${weightInfo.label} evaluated against ATS standards.`;
      const evidenceList = [...deterministic[key].evidence];

      if (aiOutput) {
        if (key === "skills" && aiOutput.skillsRelevance.evidence.length > 0) {
          evidenceList.push(...aiOutput.skillsRelevance.evidence);
          feedback = aiOutput.skillsRelevance.evidence[0]!;
        } else if (key === "experience" && aiOutput.experienceQuality.evidence.length > 0) {
          evidenceList.push(...aiOutput.experienceQuality.evidence);
          feedback = aiOutput.experienceQuality.evidence[0]!;
        } else if (key === "keywords" && aiOutput.keywordRelevance.evidence.length > 0) {
          evidenceList.push(...aiOutput.keywordRelevance.evidence);
          feedback = aiOutput.keywordRelevance.evidence[0]!;
        } else if (key === "completeness" && aiOutput.summaryQuality.evidence.length > 0) {
          evidenceList.push(...aiOutput.summaryQuality.evidence);
          feedback = aiOutput.summaryQuality.evidence[0]!;
        } else if (key === "structure" && aiOutput.projectQuality.evidence.length > 0) {
          evidenceList.push(...aiOutput.projectQuality.evidence);
          feedback = aiOutput.projectQuality.evidence[0]!;
        }
      }

      finalCategories[key] = {
        key,
        label: weightInfo.label,
        score: fusedScore,
        deterministicScore: detScore,
        geminiScore: gemScore,
        weight: weightInfo.weight,
        feedback,
        evidence: Array.from(new Set(evidenceList)),
      };

      weightedSum += fusedScore * weightInfo.weight;
    }

    // Final Overall ATS Score: 0 to 100
    const overallScore = Math.min(100, Math.max(0, Math.round(weightedSum)));
    const { tier, label } = this.getCompatibilityTier(overallScore);

    // Aggregate strengths, weaknesses & recommendations
    const collectedStrengths: string[] = [];
    const collectedWeaknesses: string[] = [];

    if (aiOutput?.strengths && aiOutput.strengths.length > 0) {
      collectedStrengths.push(...aiOutput.strengths);
    } else {
      categoriesKeys.forEach((k) => {
        if (deterministic[k].strengths.length > 0) {
          collectedStrengths.push(...deterministic[k].strengths);
        }
      });
    }

    if (aiOutput?.weaknesses && aiOutput.weaknesses.length > 0) {
      collectedWeaknesses.push(...aiOutput.weaknesses);
    } else if (aiOutput?.improvements && aiOutput.improvements.length > 0) {
      collectedWeaknesses.push(...aiOutput.improvements);
    } else {
      categoriesKeys.forEach((k) => {
        if (deterministic[k].improvements.length > 0) {
          collectedWeaknesses.push(...deterministic[k].improvements);
        }
      });
    }

    const finalStrengths = Array.from(new Set(collectedStrengths)).slice(0, 4);
    const finalWeaknesses = Array.from(new Set(collectedWeaknesses)).slice(0, 4);

    // Extract keyword analysis
    const allKeywords = new Set<string>();
    (profile.skills || []).forEach((s) => allKeywords.add(s.toLowerCase()));
    (profile.experience || []).forEach((e) =>
      (e.technologies || []).forEach((t) => allKeywords.add(t.toLowerCase())),
    );
    (profile.projects || []).forEach((p) =>
      (p.technologies || []).forEach((t) => allKeywords.add(t.toLowerCase())),
    );

    const matchedKeywords =
      profile.skills && profile.skills.length > 0
        ? profile.skills.slice(0, 8)
        : Array.from(allKeywords)
            .slice(0, 8)
            .map((k) => k.charAt(0).toUpperCase() + k.slice(1));

    const standardTechKeywords = [
      "Docker",
      "AWS",
      "CI/CD",
      "Kubernetes",
      "GraphQL",
      "PostgreSQL",
      "Redis",
      "TypeScript",
      "Python",
    ];
    const potentialMissing = standardTechKeywords
      .filter((tech) => !allKeywords.has(tech.toLowerCase()))
      .slice(0, 4);

    const recommendations =
      aiOutput?.recommendations && aiOutput.recommendations.length > 0
        ? aiOutput.recommendations.slice(0, 4)
        : finalWeaknesses.length > 0
          ? finalWeaknesses
          : [
              "Add relevant technical keywords to match specific job descriptions.",
              "Quantify achievements in experience bullet points with measurable metrics.",
              "Ensure consistent chronological formatting across all sections.",
            ];

    const summary =
      aiOutput?.summary && aiOutput.summary.trim()
        ? aiOutput.summary.trim()
        : `Your resume demonstrates ${label.toLowerCase()} with a score of ${overallScore}/100 based on standard applicant tracking system criteria.`;

    const now = new Date().toISOString();
    const currentVersion = (resume.atsAnalysis?.analysisVersion || 0) + 1;

    console.log(
      JSON.stringify({
        stage: "[ATS-DEBUG] ats-score-created",
        resumeId: resume.id,
        overallScore,
        compatibilityTier: tier,
        analysisKey,
        analysisVersion: currentVersion,
        categoriesCount: Object.keys(finalCategories).length,
      }),
    );

    return {
      overallScore,
      compatibilityTier: tier,
      compatibilityLabel: label,
      summary,
      categories: finalCategories,
      deterministicScores,
      geminiScores: aiOutput
        ? {
            skillsRelevance: aiOutput.skillsRelevance,
            experienceQuality: aiOutput.experienceQuality,
            projectQuality: aiOutput.projectQuality,
            summaryQuality: aiOutput.summaryQuality,
            keywordRelevance: aiOutput.keywordRelevance,
            achievementQuality: aiOutput.achievementQuality,
          }
        : undefined,
      finalCategoryScores,
      strengths:
        finalStrengths.length > 0
          ? finalStrengths
          : ["Comprehensive technical skill set identified", "Standard clear section formatting"],
      weaknesses:
        finalWeaknesses.length > 0
          ? finalWeaknesses
          : [
              "Add more quantifiable results in recent experience roles",
              "Ensure all relevant technology keywords are present",
            ],
      improvements: finalWeaknesses,
      keywords: {
        matched: matchedKeywords.length > 0 ? matchedKeywords : ["General Industry Terminology"],
        potentialMissing:
          potentialMissing.length > 0 ? potentialMissing : ["Cloud Services", "CI/CD Pipelines"],
      },
      keywordInsights:
        aiOutput?.keywordInsights && aiOutput.keywordInsights.length > 0
          ? aiOutput.keywordInsights
          : undefined,
      recommendations,
      resumeHash,
      analysisKey,
      rubricVersion: ATS_SCORING_CONFIG.rubricVersion,
      engineVersion: ATS_SCORING_CONFIG.engineVersion,
      geminiModel: currentModel,
      promptVersion: ATS_SCORING_CONFIG.promptVersion,
      analysisVersion: currentVersion,
      analyzedAt: now,
      resumeId: resume.id,
      originalFileName: fileName,
      aiAvailable,
      aiNotice: !aiAvailable
        ? "AI analysis is temporarily unavailable. The score below is based on the available ATS evaluation."
        : undefined,
      scoringConfig: {
        deterministicWeight: detWeight,
        geminiWeight: aiWeight,
      },
    };
  }
}

export const atsService = new AtsService();
