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
} from "../types/ats-types.ts";
import type { IResume, IParsedResumeProfile } from "../types/resume-types.ts";

export const ATS_ANALYZER_SYSTEM_INSTRUCTION = `You are a high-precision ATS (Applicant Tracking System) resume analyzer.
Your task is to evaluate the provided candidate resume profile for overall quality, ATS parseability, keyword relevance, experience impact, and structural clarity.

EVALUATION CRITERIA:
1. Completeness (20%): Look for complete contact info (email, phone, location), professional summary, work history, education, and skills.
2. Skills Presentation (25%): Evaluate technical and domain competencies, breadth and depth of skills, and modern industry relevance.
3. Experience Quality (20%): Check for clear job roles, quantifiable achievements (metrics, %, numbers), action verbs, and responsibilities.
4. Keyword Coverage (20%): Assess the density of industry-standard keywords, technologies, and domain terminology that ATS filters search for.
5. Education & Certifications (10%): Verify formal degrees, recognized institutions, and relevant professional certifications.
6. Structure & Formatting (5%): Evaluate chronological clarity, section organization, and clean machine-readable representation.

Return a strictly structured JSON response matching the schema.
Strengths and improvement recommendations MUST be specific to the actual candidate data provided. Do not hallucinate or invent qualifications.`;

export class AtsService {
  /**
   * Deterministically calculates category baseline scores directly from structured parsedProfile
   */
  public calculateDeterministicBaselines(profile: IParsedResumeProfile): Record<AtsCategoryKey, { score: number; strengths: string[]; improvements: string[] }> {
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

    // 1. Completeness evaluation (0-100)
    let completenessScore = 40;
    if (profile.personal?.fullName && profile.personal?.email) {
      completenessScore += 15;
      strengths.completeness.push("Complete candidate contact information (Name and Email)");
    }
    if (profile.personal?.phone) completenessScore += 10;
    if (profile.personal?.location) completenessScore += 5;
    if (profile.personal?.linkedin || profile.personal?.github || profile.personal?.portfolio) {
      completenessScore += 10;
      strengths.completeness.push("Professional links and portfolio profiles included");
    } else {
      improvements.completeness.push("Add LinkedIn or portfolio links to improve contact completeness");
    }
    if (profile.summary && profile.summary.trim().length > 30) {
      completenessScore += 10;
      strengths.completeness.push("Clear executive summary highlighting career focus");
    } else {
      improvements.completeness.push("Include a concise 2-3 sentence professional summary");
    }
    if (profile.experience && profile.experience.length > 0) completenessScore += 5;
    if (profile.education && profile.education.length > 0) completenessScore += 5;
    completenessScore = Math.min(100, Math.max(20, completenessScore));

    // 2. Skills evaluation (0-100)
    const skillsCount = profile.skills?.length || 0;
    let skillsScore = 40;
    if (skillsCount >= 10) {
      skillsScore = 94;
      strengths.skills.push(`Robust skill profile with ${skillsCount} identified core competencies`);
    } else if (skillsCount >= 6) {
      skillsScore = 82;
      strengths.skills.push(`Good technical coverage across ${skillsCount} key skills`);
    } else if (skillsCount >= 3) {
      skillsScore = 68;
      improvements.skills.push("Expand skills section with additional domain-specific tools and frameworks");
    } else {
      skillsScore = 45;
      improvements.skills.push("Add more core technical skills and tools to pass automated ATS filters");
    }

    // 3. Experience evaluation (0-100)
    const experienceCount = profile.experience?.length || 0;
    let experienceScore = 50;
    let hasQuantifiableMetrics = false;
    let hasTechInExp = false;

    if (experienceCount > 0) {
      experienceScore += Math.min(25, experienceCount * 12);
      for (const exp of profile.experience) {
        const descText = Array.isArray(exp.description) ? exp.description.join(" ") : String(exp.description || "");
        if (/\d+%|\$\d+|\b\d+\s*(?:users|clients|projects|ms|teams|engineers|requests)\b/i.test(descText)) {
          hasQuantifiableMetrics = true;
        }
        if (exp.technologies && exp.technologies.length > 0) {
          hasTechInExp = true;
        }
      }

      if (hasQuantifiableMetrics) {
        experienceScore += 15;
        strengths.experience.push("Measurable achievements and quantifiable metrics in work experience");
      } else {
        improvements.experience.push("Incorporate quantifiable metrics and percentage outcomes in recent job roles");
      }

      if (hasTechInExp) {
        experienceScore += 10;
        strengths.experience.push("Technologies and tools directly linked to job roles");
      }
    } else {
      experienceScore = 40;
      improvements.experience.push("Detail your practical work history or substantial project experience");
    }
    experienceScore = Math.min(100, Math.max(30, experienceScore));

    // 4. Keyword Coverage evaluation (0-100)
    let keywordScore = 55;
    const allKeywords = new Set<string>();
    (profile.skills || []).forEach((s) => allKeywords.add(s.toLowerCase()));
    (profile.experience || []).forEach((e) => (e.technologies || []).forEach((t) => allKeywords.add(t.toLowerCase())));
    (profile.projects || []).forEach((p) => (p.technologies || []).forEach((t) => allKeywords.add(t.toLowerCase())));

    if (allKeywords.size >= 12) {
      keywordScore = 92;
      strengths.keywords.push(`Strong ATS keyword density with ${allKeywords.size} distinct technical keywords`);
    } else if (allKeywords.size >= 6) {
      keywordScore = 78;
      strengths.keywords.push("Solid keyword coverage across experience and projects");
      improvements.keywords.push("Add industry-standard keywords and synonyms to maximize ATS parsing match");
    } else {
      keywordScore = 52;
      improvements.keywords.push("Incorporate high-value industry terminology and technical keywords");
    }

    // 5. Education & Certifications evaluation (0-100)
    let educationScore = 60;
    const eduCount = profile.education?.length || 0;
    const certCount = profile.certifications?.length || 0;

    if (eduCount > 0) {
      educationScore += 20;
      strengths.education.push("Verified educational background and formal degree details");
    } else {
      improvements.education.push("Add formal education or degree history");
    }

    if (certCount > 0) {
      educationScore += 20;
      strengths.education.push(`Industry certifications included (${certCount} credential${certCount > 1 ? "s" : ""})`);
    } else {
      improvements.education.push("Consider listing professional certifications or relevant accredited training");
    }
    educationScore = Math.min(100, Math.max(40, educationScore));

    // 6. Structure & Formatting evaluation (0-100)
    let structureScore = 70;
    if (profile.personal?.fullName && profile.skills?.length && (profile.experience?.length || profile.education?.length)) {
      structureScore += 18;
      strengths.structure.push("Well-structured document sections suitable for automated parser extraction");
    }
    if (profile.projects && profile.projects.length > 0) {
      structureScore += 8;
      strengths.structure.push("Dedicated portfolio / project highlights section");
    }
    structureScore = Math.min(100, Math.max(50, structureScore));

    return {
      completeness: {
        score: completenessScore,
        strengths: strengths.completeness,
        improvements: improvements.completeness,
      },
      skills: {
        score: skillsScore,
        strengths: strengths.skills,
        improvements: improvements.skills,
      },
      experience: {
        score: experienceScore,
        strengths: strengths.experience,
        improvements: improvements.experience,
      },
      keywords: {
        score: keywordScore,
        strengths: strengths.keywords,
        improvements: improvements.keywords,
      },
      education: {
        score: educationScore,
        strengths: strengths.education,
        improvements: improvements.education,
      },
      structure: {
        score: structureScore,
        strengths: strengths.structure,
        improvements: improvements.structure,
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
   * Build AI prompt for Gemini from structured parsedProfile
   */
  public buildPrompt(profile: IParsedResumeProfile, fileName: string): string {
    return `Analyze the following candidate structured resume profile for ATS readiness, formatting compatibility, keyword density, and qualitative impact.
Provide realistic, constructive evaluation scores (0-100) and actionable feedback for each category:

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
   * Performs full ATS analysis:
   * 1. Extracts deterministic baseline evidence from parsedProfile
   * 2. Calls Gemini AI for qualitative evaluation (if configured)
   * 3. Validates structured Gemini response with Zod
   * 4. Combines deterministic metrics with qualitative assessment
   * 5. Computes strictly weighted 0-100 reproducible final score
   */
  public async analyzeResume(resume: IResume): Promise<AtsAnalysisResult> {
    const profile = resume.parsedProfile;
    if (!profile) {
      throw new Error("Cannot perform ATS analysis: Resume has not been parsed yet.");
    }
    console.log(
      JSON.stringify({
        stage: "ats-analysis",
        resumeId: resume.id,
        applicantId: resume.applicantId,
        hasParsedProfile: Boolean(profile),
        skillsCount: profile.skills?.length || 0,
        experienceCount: profile.experience?.length || 0,
        educationCount: profile.education?.length || 0,
        summaryPresent: Boolean(profile.summary && profile.summary.trim().length > 0),
        geminiConfigured: geminiService.isConfigured(),
      }),
    );

    const deterministic = this.calculateDeterministicBaselines(profile);
    const fileName = resume.originalFileName || "Resume.pdf";

    let aiOutput: ValidatedGeminiAtsOutput | null = null;

    if (geminiService.isConfigured()) {
      try {
        const prompt = this.buildPrompt(profile, fileName);
        const rawAi = await geminiService.generateStructured<Record<string, unknown>>(prompt, {
          systemInstruction: ATS_ANALYZER_SYSTEM_INSTRUCTION,
          responseSchema: GEMINI_ATS_ANALYSIS_SCHEMA,
          temperature: 0.2, // Low temperature for high evaluation consistency
        });

        aiOutput = validateGeminiAtsAnalysis(rawAi);
      } catch (err: unknown) {
        // Safe fallback: Gemini error is logged server-side, deterministic scorer continues
        console.warn("Gemini ATS structured evaluation fallback invoked:", err instanceof Error ? err.message : String(err));
      }
    }

    // Blend deterministic baseline with AI qualitative scoring
    // Completeness (20%), Skills (25%), Experience (20%), Keywords (20%), Education (10%), Structure (5%)
    const categoriesKeys: AtsCategoryKey[] = [
      "completeness",
      "skills",
      "experience",
      "keywords",
      "education",
      "structure",
    ];

    const finalCategories: Record<AtsCategoryKey, any> = {} as any;

    let weightedSum = 0;

    for (const key of categoriesKeys) {
      const weightInfo = ATS_CATEGORY_WEIGHTS[key];
      const base = deterministic[key];
      const aiCat = aiOutput?.categories?.[key];

      let score: number;
      let feedback: string;

      if (aiCat && typeof aiCat.score === "number" && !isNaN(aiCat.score)) {
        // Weighted blend: 40% deterministic baseline + 60% Gemini qualitative evaluation
        const blended = Math.round(base.score * 0.4 + aiCat.score * 0.6);
        score = Math.max(0, Math.min(100, blended));
        feedback = aiCat.feedback && aiCat.feedback.trim() ? aiCat.feedback.trim() : `${weightInfo.label} evaluated with strong ATS compatibility.`;
      } else {
        score = base.score;
        feedback = base.strengths[0] || `${weightInfo.label} evaluated based on resume profile attributes.`;
      }

      finalCategories[key] = {
        key,
        label: weightInfo.label,
        score,
        weight: weightInfo.weight,
        feedback,
      };

      weightedSum += score * weightInfo.weight;
    }

    // Final numeric score: 0 to 100
    const overallScore = Math.max(0, Math.min(100, Math.round(weightedSum)));
    const { tier, label } = this.getCompatibilityTier(overallScore);

    // Aggregate strengths & improvements
    const collectedStrengths: string[] = [];
    const collectedImprovements: string[] = [];

    if (aiOutput?.strengths && aiOutput.strengths.length > 0) {
      collectedStrengths.push(...aiOutput.strengths.slice(0, 4));
    } else {
      categoriesKeys.forEach((k) => {
        if (deterministic[k].strengths.length > 0) {
          collectedStrengths.push(...deterministic[k].strengths);
        }
      });
    }

    if (aiOutput?.improvements && aiOutput.improvements.length > 0) {
      collectedImprovements.push(...aiOutput.improvements.slice(0, 4));
    } else {
      categoriesKeys.forEach((k) => {
        if (deterministic[k].improvements.length > 0) {
          collectedImprovements.push(...deterministic[k].improvements);
        }
      });
    }

    const finalStrengths = Array.from(new Set(collectedStrengths)).slice(0, 4);
    const finalImprovements = Array.from(new Set(collectedImprovements)).slice(0, 4);

    // Collect all keyword occurrences from parsed profile
    const allKeywords = new Set<string>();
    (profile.skills || []).forEach((s) => allKeywords.add(s.toLowerCase()));
    (profile.experience || []).forEach((e) => (e.technologies || []).forEach((t) => allKeywords.add(t.toLowerCase())));
    (profile.projects || []).forEach((p) => (p.technologies || []).forEach((t) => allKeywords.add(t.toLowerCase())));

    // Build keyword analysis: matched keywords from resume profile + potential missing high-demand tech
    const matchedKeywords = (profile.skills && profile.skills.length > 0)
      ? profile.skills.slice(0, 8)
      : Array.from(allKeywords).slice(0, 8).map((k) => k.charAt(0).toUpperCase() + k.slice(1));

    const standardTechKeywords = ["Docker", "AWS", "CI/CD", "Kubernetes", "GraphQL", "PostgreSQL", "Redis", "TypeScript", "Python"];
    const potentialMissing = standardTechKeywords
      .filter((tech) => !allKeywords.has(tech.toLowerCase()))
      .slice(0, 4);

    const recommendations = finalImprovements.length > 0
      ? finalImprovements
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

    return {
      overallScore,
      compatibilityTier: tier,
      compatibilityLabel: label,
      summary,
      categories: finalCategories,
      strengths: finalStrengths.length > 0 ? finalStrengths : ["Comprehensive technical skill set identified", "Standard clear section formatting"],
      improvements: finalImprovements.length > 0 ? finalImprovements : ["Add more quantifiable results in recent experience roles", "Ensure all relevant technology keywords are present"],
      keywords: {
        matched: matchedKeywords.length > 0 ? matchedKeywords : ["General Industry Terminology"],
        potentialMissing: potentialMissing.length > 0 ? potentialMissing : ["Cloud Services", "CI/CD Pipelines"],
      },
      recommendations,
      analyzedAt: now,
      resumeId: resume.id,
      originalFileName: fileName,
    };
  }
}

export const atsService = new AtsService();
