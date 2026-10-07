import { resumeRepository } from "../repositories/resume.repository.ts";
import { s3Service } from "./s3-service.ts";
import { geminiService } from "./gemini-service.ts";
import { resumeTextExtractor } from "./resume-text-extractor.ts";
import {
  validateParsedResumeProfile,
  GEMINI_RESUME_PARSER_SCHEMA,
} from "../validators/resume-parser-validator.ts";
import { Applicant } from "../models/Applicant.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { isValidObjectId, userRepository } from "../db/user-repository.ts";
import { NotFoundError, BadRequestError, AIServiceError } from "../utils/errors.ts";
import type { IResume, IParsedResumeProfile } from "../types/resume-types.ts";

export const RESUME_PARSER_SYSTEM_INSTRUCTION = `You are a strict, factual, extraction-oriented resume parser.
Your single goal is to extract candidate details from the provided resume text and output a strictly structured JSON document matching the schema.

STRICT EXTRACTION RULES:
1. ONLY extract information that is explicitly stated in the resume text.
2. NEVER invent, extrapolate, or hallucinate missing information, dates, employers, job titles, educational institutions, grades, qualifications, or skills.
3. If an item or attribute is absent from the resume, return an empty string ("") or empty array ([]).
4. If a technology is not mentioned in the resume (e.g. Docker, Kubernetes, AWS), do NOT include it in skills or technologies.
5. Separate official employment experience from independent projects, freelance side-gigs, or academic assignments.
6. Separate formal higher education degrees from vocational training and industry certifications.
7. Normalize skill names (e.g. "ReactJS" -> "React", "Node.js/Express" -> ["Node.js", "Express"]) without inventing skills.
8. NEVER infer protected personal attributes (such as age, gender, race, religion, nationality, disability, or marital status).
9. Preserve exact company names, institution names, and job roles as written in the resume.`;

export class ResumeParserService {
  /**
   * Builds prompt for Gemini AI with resume text
   */
  public buildPrompt(normalizedResumeText: string): string {
    return `Extract the candidate's structured profile from the following resume text into the requested JSON schema. Follow all strict extraction and anti-hallucination rules:

--- RESUME TEXT START ---
${normalizedResumeText}
--- RESUME TEXT END ---`;
  }

  /**
   * Syncs extracted skills and summary to the applicant document if connected to DB
   */
  private async syncApplicantProfile(applicantId: string, profile: IParsedResumeProfile, resumeId?: string, resumeFileName?: string): Promise<void> {
    try {
      await userRepository.syncApplicantFromParsedResume(applicantId, profile, resumeId, resumeFileName);
    } catch {
      // Non-fatal sync failure, does not invalidate resume parsing result
    }
  }

  /**
   * Parses an uploaded resume by ID:
   * 1. Updates parsingStatus to PROCESSING
   * 2. Retrieves private file buffer from S3
   * 3. Extracts & normalizes text (PDF/DOCX)
   * 4. Invokes Gemini structured extraction
   * 5. Validates output with Zod
   * 6. Persists result in MongoDB
   */
  public async parseResume(resumeId: string): Promise<IResume> {
    const resume = await resumeRepository.findById(resumeId);
    if (!resume) {
      throw new NotFoundError(`Resume with ID ${resumeId} not found.`);
    }

    // Mark status as PROCESSING
    await resumeRepository.updateParsingStatus(resumeId, {
      parsingStatus: "PROCESSING",
      parsingError: null,
    });

    console.log(
      JSON.stringify({
        stage: "[ATS-DEBUG] parsing-start",
        resumeId: resume.id,
        applicantId: resume.applicantId,
      }),
    );

    try {
      // 1. Download file buffer from S3 storage
      const fileData = await s3Service.getFileBuffer(resume.s3Key);
      if (!fileData || !fileData.buffer || fileData.buffer.length === 0) {
        throw new BadRequestError("Unable to retrieve resume file from storage.");
      }

      // 2. Extract text from PDF or DOCX
      const extraction = await resumeTextExtractor.extractText(fileData.buffer, resume.mimeType);

      if (!extraction || extraction.charCount === 0 || !extraction.normalizedText.trim()) {
        throw new BadRequestError("Unable to extract readable text from this resume.");
      }

      console.log(
        JSON.stringify({
          stage: "[ATS-DEBUG] text-extraction",
          resumeId: resume.id,
          textLength: extraction.charCount,
        }),
      );

      // 3. Build prompt & invoke Gemini structured generation
      const prompt = this.buildPrompt(extraction.normalizedText);

      const rawAiResponse = await geminiService.generateStructured<Record<string, unknown>>(prompt, {
        systemInstruction: RESUME_PARSER_SYSTEM_INSTRUCTION,
        responseSchema: GEMINI_RESUME_PARSER_SCHEMA,
        temperature: 0.1, // Low temperature for high extraction fidelity
      });

      // 4. Runtime Zod Schema Validation
      const validatedProfile = validateParsedResumeProfile(rawAiResponse);

      console.log(
        JSON.stringify({
          stage: "[ATS-DEBUG] parsed-profile-created",
          resumeId: resume.id,
          parsingStatus: "COMPLETED",
          hasParsedProfile: true,
          skillsCount: validatedProfile.skills?.length || 0,
          experienceCount: validatedProfile.experience?.length || 0,
          educationCount: validatedProfile.education?.length || 0,
          summaryPresent: Boolean(validatedProfile.summary && validatedProfile.summary.trim().length > 0),
        }),
      );

      // 5. Persist COMPLETED state in MongoDB and reset cached atsAnalysis so it's fresh
      const now = new Date().toISOString();
      const updatedResume = await resumeRepository.updateParsingStatus(resumeId, {
        parsingStatus: "COMPLETED",
        parsedProfile: validatedProfile,
        parsedAt: now,
        parsingError: null,
        atsScore: null,
        atsAnalysis: null,
      });

      // 6. Sync applicant profile
      await this.syncApplicantProfile(resume.applicantId, validatedProfile, resume.id, resume.originalFileName);

      return updatedResume || resume;
    } catch (err: unknown) {
      // Scrub and sanitize error message
      let safeError = "Failed to parse resume.";
      if (err instanceof BadRequestError || err instanceof NotFoundError) {
        safeError = err.message;
      } else if (err instanceof AIServiceError) {
        safeError = err.message;
      } else if (err instanceof Error) {
        safeError = geminiService.sanitizeErrorMessage(err.message);
      }

      // Persist FAILED state in MongoDB
      await resumeRepository.updateParsingStatus(resumeId, {
        parsingStatus: "FAILED",
        parsingError: safeError,
      });

      if (err instanceof BadRequestError || err instanceof NotFoundError || err instanceof AIServiceError) {
        throw err;
      }

      throw new AIServiceError(safeError, 502);
    }
  }
}

export const resumeParserService = new ResumeParserService();
