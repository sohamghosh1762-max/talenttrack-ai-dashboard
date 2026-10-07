import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { s3Service } from "../services/s3-service.ts";
import { geminiService } from "../services/gemini-service.ts";
import { resumeTextExtractor } from "../services/resume-text-extractor.ts";
import { resumeParserService } from "../services/resume-parser-service.ts";
import { handleApiRequest } from "../routes/index.ts";
import { validateParsedResumeProfile } from "../validators/resume-parser-validator.ts";
import { AIServiceError, BadRequestError } from "../utils/errors.ts";

function createJsonRequest(
  url: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const init: RequestInit = {
    method: options.method || "GET",
    headers,
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  return new Request(url, init);
}

describe("AI RESUME PARSING & STRUCTURED EXTRACTION SUITE", () => {
  let applicant1User: any;
  let applicant1Token: string;
  let applicant2User: any;
  let applicant2Token: string;
  let recruiterUser: any;
  let recruiterToken: string;
  let adminUser: any;
  let adminToken: string;

  let testResume1: any;
  let testResume2: any;
  let testJob1: any;
  let testApp1: any;

  beforeEach(async () => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    resumeRepository.clearAll();
    applicationRepository.clearAll();
    jobRepository.clearAll();
    s3Service.clearMockStorage();

    // 1. Create Applicant 1
    applicant1User = userRepository.createUser({
      name: "Jane Applicant",
      email: "jane.applicant@example.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicant1Token = "applicant1-test-token-abcdef123456";
    sessionRepository.createSession(applicant1User.id, applicant1Token);

    // 2. Create Applicant 2
    applicant2User = userRepository.createUser({
      name: "John Unrelated",
      email: "john.unrelated@example.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicant2Token = "applicant2-test-token-abcdef123456";
    sessionRepository.createSession(applicant2User.id, applicant2Token);

    // 3. Create Recruiter
    recruiterUser = userRepository.createUser({
      name: "Sarah Recruiter",
      email: "sarah.recruiter@example.com",
      passwordHash: "Password123!",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiterToken = "recruiter-test-token-abcdef123456";
    sessionRepository.createSession(recruiterUser.id, recruiterToken);

    // 4. Create Admin
    adminUser = userRepository.createUser({
      name: "Alex Admin",
      email: "alex.admin@example.com",
      passwordHash: "Password123!",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    });
    adminToken = "admin-test-token-abcdef123456";
    sessionRepository.createSession(adminUser.id, adminToken);

    // 5. Create test Job and Application
    testJob1 = await jobRepository.create({
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "San Francisco, CA",
      employmentType: "FULL_TIME",
      experienceRequired: "SENIOR",
      description: "We are seeking a senior full-stack engineer.",
      skills: ["React", "TypeScript", "Node.js", "MongoDB"],
      recruiterId: recruiterUser.id,
    });


    // Sample resume text stored as buffer in mock S3
    const sampleResumeText = `Aarav Mehta
aarav.mehta@example.com | (555) 019-2831 | San Francisco, CA
https://linkedin.com/in/aaravmehta | https://github.com/aaravmehta

SUMMARY
Senior Software Engineer with 5+ years of experience specializing in React, TypeScript, Node.js, and distributed backend systems.

SKILLS
React, TypeScript, Node.js, Express, MongoDB, PostgreSQL, Docker, AWS, Tailwind CSS

EXPERIENCE
TechFlow Systems | Senior Software Engineer | San Francisco, CA
June 2022 - Present
- Architected high-throughput microservices handling 2M+ requests daily.
- Led frontend migration to Next.js reducing bundle size by 35%.

Innovate Labs | Fullstack Developer | San Jose, CA
July 2019 - May 2022
- Developed scalable REST APIs using Express and MongoDB.
- Built reusable component library using React and Tailwind CSS.

EDUCATION
University of California, Berkeley
B.S. in Computer Science (2015 - 2019)
Grade: 3.8 GPA

PROJECTS
OpenSource ATS | https://github.com/aaravmehta/ats
- Automated candidate ranking system built with TypeScript and MongoDB.

CERTIFICATIONS
AWS Certified Solutions Architect | Amazon Web Services | 2023

LANGUAGES
English, Hindi

ACHIEVEMENTS
1st Place Winner - SF Tech Hackathon 2023`;

    // 6. Store mock PDF buffers in S3
    const s3Result1 = await s3Service.uploadFile({
      applicantId: applicant1User.id,
      fileBuffer: Buffer.from(sampleResumeText, "utf-8"),
      originalFileName: "Aarav_Mehta_Resume.pdf",
      mimeType: "application/pdf",
      fileSize: sampleResumeText.length,
    });

    testResume1 = await resumeRepository.create({
      applicantId: applicant1User.id,
      originalFileName: "Aarav_Mehta_Resume.pdf",
      storedFileName: s3Result1.storedFileName,
      mimeType: "application/pdf",
      fileSize: sampleResumeText.length,
      s3Key: s3Result1.s3Key,
      s3Bucket: s3Result1.s3Bucket,
    });

    const s3Result2 = await s3Service.uploadFile({
      applicantId: applicant2User.id,
      fileBuffer: Buffer.from("Unrelated applicant resume buffer with minimal content text here.", "utf-8"),
      originalFileName: "John_Resume.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 100,
    });

    testResume2 = await resumeRepository.create({
      applicantId: applicant2User.id,
      originalFileName: "John_Resume.docx",
      storedFileName: s3Result2.storedFileName,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 100,
      s3Key: s3Result2.s3Key,
      s3Bucket: s3Result2.s3Bucket,
    });

    // Link Applicant 1 to Recruiter's Job
    testApp1 = await applicationRepository.create({
      jobId: testJob1.id,
      applicantId: applicant1User.id,
      recruiterId: recruiterUser.id,
      resumeId: testResume1.id,
    });


    // Mock Gemini generateStructured client
    (geminiService as any).client = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            personal: {
              fullName: "Aarav Mehta",
              email: "aarav.mehta@example.com",
              phone: "(555) 019-2831",
              location: "San Francisco, CA",
              linkedin: "https://linkedin.com/in/aaravmehta",
              github: "https://github.com/aaravmehta",
              portfolio: "",
            },
            summary: "Senior Software Engineer with 5+ years of experience specializing in React, TypeScript, Node.js, and distributed backend systems.",
            skills: ["React", "TypeScript", "Node.js", "Express", "MongoDB", "PostgreSQL", "Docker", "AWS", "Tailwind CSS"],
            education: [
              {
                degree: "B.S. in Computer Science",
                institution: "University of California, Berkeley",
                fieldOfStudy: "Computer Science",
                startDate: "2015",
                endDate: "2019",
                grade: "3.8 GPA",
              },
            ],
            experience: [
              {
                company: "TechFlow Systems",
                role: "Senior Software Engineer",
                location: "San Francisco, CA",
                startDate: "2022-06",
                endDate: "Present",
                description: [
                  "Architected high-throughput microservices handling 2M+ requests daily.",
                  "Led frontend migration to Next.js reducing bundle size by 35%.",
                ],
                technologies: ["React", "TypeScript", "Node.js", "Next.js"],
              },
              {
                company: "Innovate Labs",
                role: "Fullstack Developer",
                location: "San Jose, CA",
                startDate: "2019-07",
                endDate: "2022-05",
                description: [
                  "Developed scalable REST APIs using Express and MongoDB.",
                  "Built reusable component library using React and Tailwind CSS.",
                ],
                technologies: ["Express", "MongoDB", "React", "Tailwind CSS"],
              },
            ],
            projects: [
              {
                name: "OpenSource ATS",
                description: "Automated candidate ranking system built with TypeScript and MongoDB.",
                technologies: ["TypeScript", "MongoDB"],
                url: "https://github.com/aaravmehta/ats",
              },
            ],
            certifications: [
              {
                name: "AWS Certified Solutions Architect",
                issuer: "Amazon Web Services",
                date: "2023",
              },
            ],
            languages: ["English", "Hindi"],
            achievements: ["1st Place Winner - SF Tech Hackathon 2023"],
          }),
        }),
      },
    };
  });

  describe("1. Text Extraction & Normalization", () => {
    it("normalizes excessive whitespace while preserving structure", () => {
      const dirty = "  Aarav   Mehta  \r\n\r\n\r\n\r\n  Software   Engineer  \n\n\nSkills:   React,   TypeScript  ";
      const normalized = resumeTextExtractor.normalizeText(dirty);

      assert.equal(normalized.isTruncated, false);
      assert.ok(normalized.normalizedText.includes("Aarav Mehta"));
      assert.ok(normalized.normalizedText.includes("Software Engineer"));
      assert.ok(normalized.normalizedText.includes("Skills: React, TypeScript"));
      assert.equal(normalized.normalizedText.includes("   "), false);
      assert.equal(normalized.normalizedText.includes("\r"), false);
    });

    it("safely truncates massive text exceeding 50,000 characters limit", () => {
      const massive = "Software Engineer with skills ".repeat(2500); // > 70,000 chars
      const result = resumeTextExtractor.normalizeText(massive);

      assert.equal(result.isTruncated, true);
      assert.ok(result.normalizedText.includes("[Resume text truncated for processing]"));
      assert.ok(result.normalizedText.length <= 50_100);
    });

    it("rejects empty or whitespace-only resume buffers safely with 400 Bad Request", async () => {
      await assert.rejects(
        async () => {
          await resumeTextExtractor.extractText(Buffer.from("   \n\n  "), "application/pdf");
        },
        (err: any) => {
          return err instanceof BadRequestError && err.message.includes("Unable to extract readable text");
        },
      );
    });
  });

  describe("2. Schema Validation & Anti-Hallucination Constraints", () => {
    it("validates a conforming structured candidate profile with all fields", () => {
      const sample = {
        personal: {
          fullName: "Aarav Mehta",
          email: "aarav.mehta@example.com",
          phone: "+1 555-0199",
          location: "San Francisco, CA",
          linkedin: "https://linkedin.com",
          github: "https://github.com",
          portfolio: "",
        },
        summary: "Full stack engineer.",
        skills: ["React", "TypeScript", "Node.js"],
        education: [
          {
            degree: "B.S. CS",
            institution: "UC Berkeley",
            fieldOfStudy: "Computer Science",
            startDate: "2018",
            endDate: "2022",
            grade: "3.8",
          },
        ],
        experience: [
          {
            company: "TechFlow",
            role: "Engineer",
            location: "SF",
            startDate: "2022",
            endDate: "Present",
            description: ["Built APIs"],
            technologies: ["Node.js"],
          },
        ],
        projects: [
          {
            name: "ATS",
            description: "Parsing tool",
            technologies: ["TS"],
            url: "https://github.com/ats",
          },
        ],
        certifications: [
          {
            name: "AWS Architect",
            issuer: "AWS",
            date: "2023",
          },
        ],
        languages: ["English"],
        achievements: ["Hackathon Winner"],
      };

      const validated = validateParsedResumeProfile(sample);
      assert.equal(validated.personal.fullName, "Aarav Mehta");
      assert.deepEqual(validated.skills, ["React", "TypeScript", "Node.js"]);
      assert.equal(validated.education.length, 1);
      assert.equal(validated.experience.length, 1);
      assert.equal(validated.projects.length, 1);
      assert.equal(validated.certifications.length, 1);
      assert.deepEqual(validated.languages, ["English"]);
      assert.deepEqual(validated.achievements, ["Hackathon Winner"]);
    });

    it("populates default values for missing optional fields without throwing", () => {
      const minimal = {
        summary: "Self-taught developer",
        skills: ["JavaScript", "HTML"],
      };

      const validated = validateParsedResumeProfile(minimal);
      assert.equal(validated.personal.fullName, "");
      assert.equal(validated.personal.email, "");
      assert.deepEqual(validated.skills, ["JavaScript", "HTML"]);
      assert.deepEqual(validated.education, []);
      assert.deepEqual(validated.experience, []);
      assert.deepEqual(validated.projects, []);
      assert.deepEqual(validated.certifications, []);
      assert.deepEqual(validated.languages, []);
      assert.deepEqual(validated.achievements, []);
    });
  });

  describe("3. Authorization Matrix for POST /api/resumes/:id/parse", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/resumes/${testResume1.id}/parse`, {
        method: "POST",
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 401);
    });

    it("allows applicant to parse their own resume (200 OK)", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/resumes/${testResume1.id}/parse`, {
        method: "POST",
        token: applicant1Token,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = (await res.json()) as any;
      assert.equal(json.success, true);
      assert.equal(json.data.status, "COMPLETED");
      assert.equal(json.data.parsingStatus, "COMPLETED");
      assert.equal(json.data.parsedProfile.personal.fullName, "Aarav Mehta");
      assert.ok(json.data.parsedProfile.skills.includes("React"));
      assert.ok(json.data.parsedAt);
    });

    it("forbids an applicant from parsing another applicant's resume (403 Forbidden)", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/resumes/${testResume1.id}/parse`, {
        method: "POST",
        token: applicant2Token, // Applicant 2 trying to parse Applicant 1's resume
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 403);

      const json = (await res.json()) as any;
      assert.equal(json.success, false);
      assert.ok(json.error.message.includes("not authorized to parse this resume"));
    });

    it("allows recruiter to parse candidate resume applied to their job (200 OK)", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/resumes/${testResume1.id}/parse`, {
        method: "POST",
        token: recruiterToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = (await res.json()) as any;
      assert.equal(json.success, true);
      assert.equal(json.data.status, "COMPLETED");
    });

    it("forbids recruiter from parsing candidate resume not applied to their job (403 Forbidden)", async () => {
      // testResume2 belongs to Applicant 2 who has NOT applied to any job
      const req = createJsonRequest(`http://localhost:3000/api/resumes/${testResume2.id}/parse`, {
        method: "POST",
        token: recruiterToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 403);

      const json = (await res.json()) as any;
      assert.equal(json.success, false);
      assert.ok(json.error.message.includes("not applied to your jobs"));
    });

    it("allows admin to parse any candidate resume (200 OK)", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/resumes/${testResume2.id}/parse`, {
        method: "POST",
        token: adminToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);
    });

    it("returns 404 for non-existent resume ID", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/resumes/65f1a2b3c4d5e6f7a8b9c999/parse`, {
        method: "POST",
        token: adminToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 404);
    });

    it("returns 400 for malformed resume ID format", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/resumes/invalid-id-format/parse`, {
        method: "POST",
        token: adminToken,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 400);
    });
  });

  describe("4. State Persistence, Re-parsing & Failure Handling", () => {
    it("persists parsedProfile and COMPLETED status into MongoDB repository", async () => {
      const initial = await resumeRepository.findById(testResume1.id);
      assert.equal(initial?.parsingStatus, "NOT_STARTED");
      assert.equal(initial?.parsedProfile, null);

      await resumeParserService.parseResume(testResume1.id);

      const updated = await resumeRepository.findById(testResume1.id);
      assert.equal(updated?.parsingStatus, "COMPLETED");
      assert.ok(updated?.parsedProfile);
      assert.equal(updated?.parsedProfile.personal.fullName, "Aarav Mehta");
      assert.ok(updated?.parsedAt);
      assert.equal(updated?.parsingError, null);
    });

    it("allows re-parsing an already COMPLETED resume to update data", async () => {
      // 1. Initial parse
      await resumeParserService.parseResume(testResume1.id);

      // 2. Re-parse
      const reParsed = await resumeParserService.parseResume(testResume1.id);
      assert.equal(reParsed.parsingStatus, "COMPLETED");
      assert.ok(reParsed.parsedProfile);
    });

    it("handles Gemini rate limit / failure by setting status to FAILED and storing safe error", async () => {
      // Mock Gemini throwing 429
      (geminiService as any).client = {
        models: {
          generateContent: async () => {
            throw new Error("429 Resource has been exhausted (quota exceeded).");
          },
        },
      };

      await assert.rejects(
        async () => {
          await resumeParserService.parseResume(testResume1.id);
        },
        (err: any) => err instanceof AIServiceError && err.statusCode === 429,
      );

      const failedResume = await resumeRepository.findById(testResume1.id);
      assert.equal(failedResume?.parsingStatus, "FAILED");
      assert.ok(failedResume?.parsingError);
      assert.ok(failedResume?.parsingError.includes("rate limit exceeded"));

      // 3. Re-trying after resolving Gemini failure restores COMPLETED state
      (geminiService as any).client = {
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              personal: { fullName: "Aarav Mehta" },
              summary: "Recovered profile",
              skills: ["React", "TypeScript"],
            }),
          }),
        },
      };

      const recovered = await resumeParserService.parseResume(testResume1.id);
      assert.equal(recovered.parsingStatus, "COMPLETED");
      assert.equal(recovered.parsingError, null);
    });
  });

  describe("5. Security & Privacy Guarantees", () => {
    it("never exposes Gemini API keys or AWS credentials in parse API response", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/resumes/${testResume1.id}/parse`, {
        method: "POST",
        token: applicant1Token,
      });

      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = await res.json();
      const payloadString = JSON.stringify(json);

      assert.equal(payloadString.includes("AIza"), false);
      assert.equal(payloadString.includes("AWS_SECRET_ACCESS_KEY"), false);
      assert.equal(payloadString.includes("AWS_ACCESS_KEY_ID"), false);
      assert.equal(payloadString.includes("GEMINI_API_KEY"), false);
      assert.equal(payloadString.includes("s3Key"), false);
    });
  });
});
