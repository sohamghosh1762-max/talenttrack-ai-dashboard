import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { atsService } from "../services/ats-service.ts";
import { handleApiRequest } from "../routes/index.ts";
import { validateGeminiAtsAnalysis } from "../validators/ats-validator.ts";
import { calculateJobMatch } from "../../lib/applicant-utils.ts";
import type { IResume, IParsedResumeProfile } from "../types/resume-types.ts";
import type { IJob } from "../types/job-types.ts";

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

function createMultipartResumeRequest(
  url: string,
  options: {
    token?: string;
    fileName?: string;
    fileContent?: Uint8Array | Buffer | string;
    mimeType?: string;
    fieldName?: string;
  } = {},
): Request {
  const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
  const fieldName = options.fieldName ?? "resume";
  const fileName = options.fileName ?? "resume.pdf";
  const mimeType = options.mimeType ?? "application/pdf";

  let fileBytes: Uint8Array;
  if (typeof options.fileContent === "string") {
    fileBytes = new TextEncoder().encode(options.fileContent);
  } else if (options.fileContent instanceof Uint8Array || Buffer.isBuffer(options.fileContent)) {
    fileBytes = options.fileContent;
  } else if (fileName.endsWith(".docx")) {
    // Valid DOCX / ZIP magic bytes (PK\x03\x04)
    fileBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
  } else {
    // Default valid PDF buffer with %PDF- header
    fileBytes = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xd0, 0xd4, 0xc5, 0xd8, 0x0a,
      0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a,
    ]);
  }

  const headerPart = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footerPart = `\r\n--${boundary}--\r\n`;

  const headerBytes = new TextEncoder().encode(headerPart);
  const footerBytes = new TextEncoder().encode(footerPart);

  const fullPayload = new Uint8Array(headerBytes.length + fileBytes.length + footerBytes.length);
  fullPayload.set(headerBytes, 0);
  fullPayload.set(fileBytes, headerBytes.length);
  fullPayload.set(footerBytes, headerBytes.length + fileBytes.length);

  const headers: Record<string, string> = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
  };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  return new Request(url, {
    method: "POST",
    headers,
    body: fullPayload,
  });
}

describe("ATS RESUME SCORE & COMPATIBILITY SUITE", () => {
  let applicant1User: any;
  let applicant1Token: string;
  let applicant2User: any;
  let applicant2Token: string;
  let recruiterUser: any;
  let recruiterToken: string;

  const validParsedProfile: IParsedResumeProfile = {
    personal: {
      fullName: "Jane Candidate",
      email: "jane.candidate@example.com",
      phone: "+1 555-0123",
      location: "San Francisco, CA",
      linkedin: "https://linkedin.com/in/janecandidate",
      github: "https://github.com/janecandidate",
      portfolio: "https://janecandidate.dev",
    },
    summary: "Senior Full Stack Engineer with 6+ years of experience in React, TypeScript, Node.js, and cloud systems.",
    skills: ["React", "TypeScript", "Node.js", "Express", "MongoDB", "PostgreSQL", "Docker", "AWS", "GraphQL", "Tailwind CSS"],
    education: [
      {
        degree: "B.S. in Computer Science",
        institution: "University of California, Berkeley",
        fieldOfStudy: "Computer Science",
        startDate: "2016-09",
        endDate: "2020-05",
        grade: "3.9 GPA",
      },
    ],
    experience: [
      {
        company: "TechCorp Systems",
        role: "Senior Frontend Engineer",
        location: "San Francisco, CA",
        startDate: "2022-01",
        endDate: "Present",
        description: [
          "Architected real-time candidate ranking system increasing throughput by 45%.",
          "Led a team of 5 engineers delivering high-availability React dashboards handling 500k daily users.",
        ],
        technologies: ["React", "TypeScript", "GraphQL", "AWS"],
      },
      {
        company: "Innovate Inc",
        role: "Software Developer",
        location: "Oakland, CA",
        startDate: "2020-06",
        endDate: "2021-12",
        description: [
          "Developed scalable REST APIs with Node.js and PostgreSQL with 99.9% uptime.",
        ],
        technologies: ["Node.js", "Express", "PostgreSQL"],
      },
    ],
    projects: [
      {
        name: "TalentTracker AI",
        description: "AI-powered resume parsing and ATS ranking tool.",
        technologies: ["TypeScript", "Next.js", "MongoDB"],
        url: "https://github.com/janecandidate/talenttracker",
      },
    ],
    certifications: [
      {
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        date: "2023-08",
      },
    ],
    languages: ["English"],
    achievements: ["Hackathon Winner 2024 (1st place)"],
  };

  beforeEach(async () => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    resumeRepository.clearAll();
    jobRepository.clearAll();

    // 1. Create Applicant 1
    applicant1User = userRepository.createUser({
      name: "Jane Candidate",
      email: "jane.candidate@example.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicant1Token = "applicant1-test-token-ats-123456";
    sessionRepository.createSession(applicant1User.id, applicant1Token);

    // 2. Create Applicant 2
    applicant2User = userRepository.createUser({
      name: "Bob Unrelated",
      email: "bob.unrelated@example.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicant2Token = "applicant2-test-token-ats-654321";
    sessionRepository.createSession(applicant2User.id, applicant2Token);

    // 3. Create Recruiter
    recruiterUser = userRepository.createUser({
      name: "Sam Recruiter",
      email: "sam.recruiter@example.com",
      passwordHash: "Password123!",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiterToken = "recruiter-test-token-ats-789012";
    sessionRepository.createSession(recruiterUser.id, recruiterToken);
  });

  describe("1. Deterministic ATS Scoring & Calculation", () => {
    it("calculates a score between 0 and 100 for a valid parsed resume", async () => {
      const mockResume: IResume = {
        id: "mock-res-1",
        applicantId: applicant1User.id,
        originalFileName: "Jane_Candidate_Resume.pdf",
        storedFileName: "uuid-jane-candidate.pdf",
        mimeType: "application/pdf",
        fileSize: 125000,
        s3Key: "resumes/jane/uuid.pdf",
        s3Bucket: "bucket",
        uploadedAt: new Date().toISOString(),
        parsingStatus: "COMPLETED",
        parsedProfile: validParsedProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const analysis = await atsService.analyzeResume(mockResume);

      assert.ok(typeof analysis.overallScore === "number");
      assert.ok(analysis.overallScore >= 0 && analysis.overallScore <= 100);
      assert.ok(analysis.overallScore >= 75, "Rich resume should receive high ATS compatibility");
      assert.ok(analysis.compatibilityTier === "EXCELLENT" || analysis.compatibilityTier === "GOOD");
      assert.ok(analysis.compatibilityLabel.includes("ATS Compatibility"));
    });

    it("produces identical deterministic baseline scores for the same profile input", async () => {
      const baseline1 = atsService.calculateDeterministicBaselines(validParsedProfile);
      const baseline2 = atsService.calculateDeterministicBaselines(validParsedProfile);

      assert.equal(baseline1.completeness.score, baseline2.completeness.score);
      assert.equal(baseline1.skills.score, baseline2.skills.score);
      assert.equal(baseline1.experience.score, baseline2.experience.score);
      assert.equal(baseline1.keywords.score, baseline2.keywords.score);
      assert.equal(baseline1.education.score, baseline2.education.score);
      assert.equal(baseline1.structure.score, baseline2.structure.score);
    });

    it("verifies all 6 category scores and weights sum to 100%", async () => {
      const mockResume: IResume = {
        id: "mock-res-2",
        applicantId: applicant1User.id,
        originalFileName: "Jane_Resume.pdf",
        storedFileName: "uuid-jane.pdf",
        mimeType: "application/pdf",
        fileSize: 125000,
        s3Key: "resumes/jane/uuid2.pdf",
        s3Bucket: "bucket",
        uploadedAt: new Date().toISOString(),
        parsingStatus: "COMPLETED",
        parsedProfile: validParsedProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const analysis = await atsService.analyzeResume(mockResume);
      const cats = analysis.categories;

      assert.ok(cats.completeness && cats.completeness.score >= 0 && cats.completeness.score <= 100);
      assert.ok(cats.skills && cats.skills.score >= 0 && cats.skills.score <= 100);
      assert.ok(cats.experience && cats.experience.score >= 0 && cats.experience.score <= 100);
      assert.ok(cats.keywords && cats.keywords.score >= 0 && cats.keywords.score <= 100);
      assert.ok(cats.education && cats.education.score >= 0 && cats.education.score <= 100);
      assert.ok(cats.structure && cats.structure.score >= 0 && cats.structure.score <= 100);

      const totalWeight =
        cats.completeness.weight +
        cats.skills.weight +
        cats.experience.weight +
        cats.keywords.weight +
        cats.education.weight +
        cats.structure.weight;

      assert.ok(Math.abs(totalWeight - 1.0) < 0.001, "Total category weights must equal 100% (1.0)");
    });

    it("handles sparse/missing profile fields safely without NaN or crash", async () => {
      const sparseProfile: IParsedResumeProfile = {
        personal: {
          fullName: "Sparse Candidate",
          email: "sparse@example.com",
          phone: "",
          location: "",
          linkedin: "",
          github: "",
          portfolio: "",
        },
        summary: "",
        skills: ["HTML"],
        education: [],
        experience: [],
        projects: [],
        certifications: [],
        languages: [],
        achievements: [],
      };

      const mockResume: IResume = {
        id: "mock-res-sparse",
        applicantId: applicant1User.id,
        originalFileName: "Sparse_Resume.pdf",
        storedFileName: "uuid-sparse.pdf",
        mimeType: "application/pdf",
        fileSize: 50000,
        s3Key: "resumes/sparse/uuid.pdf",
        s3Bucket: "bucket",
        uploadedAt: new Date().toISOString(),
        parsingStatus: "COMPLETED",
        parsedProfile: sparseProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const analysis = await atsService.analyzeResume(mockResume);
      assert.ok(!isNaN(analysis.overallScore));
      assert.ok(analysis.overallScore >= 0 && analysis.overallScore <= 100);
      assert.ok(analysis.improvements.length > 0, "Sparse resume should suggest improvements");
    });
  });

  describe("2. Gemini Schema Validation & Error Resilience", () => {
    it("validates a compliant Gemini structured ATS response", () => {
      const validAiOutput = {
        summary: "Solid technical background with clear full stack engineering achievements.",
        categories: {
          completeness: { score: 92, feedback: "Full contact information and summary provided." },
          skills: { score: 88, feedback: "Diverse modern framework coverage." },
          experience: { score: 85, feedback: "Impactful achievements and metric points." },
          keywords: { score: 84, feedback: "Strong terminology matching ATS standards." },
          education: { score: 95, feedback: "Accredited degree present." },
          structure: { score: 90, feedback: "Clean layout with standard headings." },
        },
        strengths: ["Strong technical skill set", "Quantified performance metrics"],
        improvements: ["Add more cloud architecture keywords"],
      };

      const result = validateGeminiAtsAnalysis(validAiOutput);
      assert.equal(result.summary, validAiOutput.summary);
      assert.equal(result.categories.completeness.score, 92);
      assert.equal(result.strengths.length, 2);
    });

    it("safely transforms and recovers from malformed Gemini output without throwing", () => {
      const malformedAiOutput = {
        summary: "Incomplete JSON output",
        categories: {
          completeness: { score: "88" }, // string instead of number
          skills: null,
        },
        strengths: "Single string instead of array",
      };

      const result = validateGeminiAtsAnalysis(malformedAiOutput);
      assert.ok(result);
      assert.equal(result.categories.completeness.score, 88);
      assert.equal(result.categories.skills.score, 75); // fallback default
      assert.ok(Array.isArray(result.strengths));
      assert.equal(result.strengths[0], "Single string instead of array");
    });
  });

  describe("3. ATS API Endpoint Matrix (/api/applicant/ats-score)", () => {
    it("rejects unauthenticated request with 401", async () => {
      const req = createJsonRequest("http://localhost:3000/api/applicant/ats-score");
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 401);
    });

    it("rejects recruiter request with 403 Forbidden", async () => {
      const req = createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        token: recruiterToken,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 403);
    });

    it("returns hasResume: false when applicant has no resume uploaded", async () => {
      const req = createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        token: applicant1Token,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.hasResume, false);
      assert.equal(json.data.analysis, null);
    });

    it("returns ATS score when applicant has a completed parsed resume", async () => {
      // Create completed resume for applicant 1
      const resume = await resumeRepository.create({
        applicantId: applicant1User.id,
        originalFileName: "Jane_Resume.pdf",
        storedFileName: "uuid-jane-123.pdf",
        mimeType: "application/pdf",
        fileSize: 150000,
        s3Key: "resumes/jane/uuid-jane-123.pdf",
        s3Bucket: "talenttrack-resumes",
      });

      await resumeRepository.updateParsingStatus(resume.id, {
        parsingStatus: "COMPLETED",
        parsedProfile: validParsedProfile,
        parsedAt: new Date().toISOString(),
      });

      const req = createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        token: applicant1Token,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.hasResume, true);
      assert.equal(json.data.parsingStatus, "COMPLETED");
      assert.ok(json.data.analysis);
      assert.ok(json.data.analysis.overallScore >= 0 && json.data.analysis.overallScore <= 100);
      assert.ok(json.data.analysis.categories.completeness);
      assert.ok(json.data.analysis.categories.skills);
    });

    it("enforces tenant privacy: Applicant 2 cannot access Applicant 1's ATS score", async () => {
      // Create resume for applicant 1 only
      const resume1 = await resumeRepository.create({
        applicantId: applicant1User.id,
        originalFileName: "Jane_Secret_Resume.pdf",
        storedFileName: "uuid-jane-secret.pdf",
        mimeType: "application/pdf",
        fileSize: 150000,
        s3Key: "resumes/jane/uuid-jane-secret.pdf",
        s3Bucket: "talenttrack-resumes",
      });

      await resumeRepository.updateParsingStatus(resume1.id, {
        parsingStatus: "COMPLETED",
        parsedProfile: validParsedProfile,
      });

      // Request as Applicant 2
      const req2 = createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        token: applicant2Token,
      });
      const res2 = await handleApiRequest(req2);
      assert.ok(res2);
      assert.equal(res2.status, 200);

      const json2 = await res2.json();
      // Applicant 2 has no resume, must NOT see Applicant 1's data
      assert.equal(json2.data.hasResume, false);
      assert.equal(json2.data.analysis, null);
    });

    it("allows POST /api/applicant/ats-score/analyze to recalculate ATS score", async () => {
      const resume = await resumeRepository.create({
        applicantId: applicant1User.id,
        originalFileName: "Jane_Resume.pdf",
        storedFileName: "uuid-jane-456.pdf",
        mimeType: "application/pdf",
        fileSize: 150000,
        s3Key: "resumes/jane/uuid-jane-456.pdf",
        s3Bucket: "talenttrack-resumes",
      });

      await resumeRepository.updateParsingStatus(resume.id, {
        parsingStatus: "COMPLETED",
        parsedProfile: validParsedProfile,
      });

      const req = createJsonRequest("http://localhost:3000/api/applicant/ats-score/analyze", {
        method: "POST",
        token: applicant1Token,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.analysis);
      assert.ok(json.data.analysis.overallScore >= 0);
    });
  });

  describe("4. Separation of ATS Resume Score vs Job Match Score", () => {
    it("keeps ATS Resume Score and Job Match Score as independent distinct metrics", async () => {
      const mockResume: IResume = {
        id: "mock-res-sep",
        applicantId: applicant1User.id,
        originalFileName: "Jane_Resume.pdf",
        storedFileName: "uuid-jane.pdf",
        mimeType: "application/pdf",
        fileSize: 125000,
        s3Key: "resumes/jane/uuid.pdf",
        s3Bucket: "bucket",
        uploadedAt: new Date().toISOString(),
        parsingStatus: "COMPLETED",
        parsedProfile: validParsedProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Calculate general ATS Resume Score
      const atsAnalysis = await atsService.analyzeResume(mockResume);

      // 2. Calculate specific Job Match Score for a Frontend role
      const frontendJob: IJob = {
        id: "job-fe",
        title: "Senior React Engineer",
        description: "Seeking expert React, TypeScript, GraphQL engineer.",
        department: "Engineering",
        location: "Remote",
        employmentType: "Full-Time",
        experienceRequired: "5+ years",
        skills: ["React", "TypeScript", "GraphQL", "AWS"],
        recruiterId: recruiterUser.id,
        status: "PUBLISHED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const jobMatch = calculateJobMatch(frontendJob, validParsedProfile.skills);

      // Verify they are distinct metrics
      assert.ok(typeof atsAnalysis.overallScore === "number");
      assert.ok(typeof jobMatch.matchScore === "number");
      assert.ok(jobMatch.matchedSkills.includes("React"));
      assert.ok(jobMatch.matchedSkills.includes("TypeScript"));
      assert.ok(jobMatch.isAvailable);
    });
  });

  describe("5. Security & Secret Protection", () => {
    it("never exposes GEMINI_API_KEY, AWS secrets, or DB credentials in ATS API responses", async () => {
      const resume = await resumeRepository.create({
        applicantId: applicant1User.id,
        originalFileName: "Jane_Resume.pdf",
        storedFileName: "uuid-jane-sec.pdf",
        mimeType: "application/pdf",
        fileSize: 150000,
        s3Key: "resumes/jane/uuid-jane-sec.pdf",
        s3Bucket: "talenttrack-resumes",
      });

      await resumeRepository.updateParsingStatus(resume.id, {
        parsingStatus: "COMPLETED",
        parsedProfile: validParsedProfile,
      });

      const req = createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        token: applicant1Token,
      });
      const res = await handleApiRequest(req);
      assert.ok(res);

      const rawText = await res.text();
      assert.ok(!rawText.includes("AIzaSy"), "Must not leak Google API key prefix");
      assert.ok(!rawText.includes("GEMINI_API_KEY"), "Must not leak GEMINI_API_KEY variable");
      assert.ok(!rawText.includes("aws_secret_access_key"), "Must not leak AWS credentials");
      assert.ok(!rawText.includes("mongodb+srv"), "Must not leak MongoDB connection string");
    });
  });

  describe("6. End-to-End ATS Resume Upload & Replacement Flow", () => {
    it("allows applicant to upload PDF resume and derives identity server-side", async () => {
      const uploadReq = createMultipartResumeRequest("http://localhost:3000/api/resumes", {
        token: applicant1Token,
        fileName: "Jane_Resume.pdf",
        mimeType: "application/pdf",
      });

      const uploadRes = await handleApiRequest(uploadReq);
      assert.ok(uploadRes);
      assert.equal(uploadRes.status, 201);

      const uploadJson = await uploadRes.json();
      assert.equal(uploadJson.success, true);
      assert.equal(uploadJson.data.applicantId, applicant1User.id);
      assert.equal(uploadJson.data.originalFileName, "Jane_Resume.pdf");

      // Verify MongoDB/repository record was created
      const resume = await resumeRepository.findById(uploadJson.data.id);
      assert.ok(resume);
      assert.equal(resume.applicantId, applicant1User.id);
    });

    it("rejects unsupported file formats during upload", async () => {
      const uploadReq = createMultipartResumeRequest("http://localhost:3000/api/resumes", {
        token: applicant1Token,
        fileName: "script.sh",
        mimeType: "text/x-shellscript",
        fileContent: "#!/bin/bash\necho 'hello'",
      });

      const uploadRes = await handleApiRequest(uploadReq);
      assert.ok(uploadRes);
      assert.equal(uploadRes.status, 400);

      const uploadJson = await uploadRes.json();
      assert.equal(uploadJson.success, false);
      assert.ok(uploadJson.error.message.includes("Invalid file type") || uploadJson.error.message.includes("PDF"));
    });

    it("replaces existing resume and invalidates previous ATS score", async () => {
      // 1. Initial resume with completed ATS analysis
      const resume1 = await resumeRepository.create({
        applicantId: applicant1User.id,
        originalFileName: "Old_Resume.pdf",
        storedFileName: "uuid-old.pdf",
        mimeType: "application/pdf",
        fileSize: 100000,
        s3Key: "resumes/jane/uuid-old.pdf",
        s3Bucket: "talenttrack-resumes",
      });

      await resumeRepository.updateParsingStatus(resume1.id, {
        parsingStatus: "COMPLETED",
        parsedProfile: validParsedProfile,
      });

      // Compute initial ATS analysis
      const getReq1 = createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        token: applicant1Token,
      });
      const getRes1 = await handleApiRequest(getReq1);
      const getJson1 = await getRes1?.json();
      assert.equal(getJson1.data.fileName, "Old_Resume.pdf");
      assert.ok(getJson1.data.analysis);

      // 2. Upload replacement resume
      const uploadReq2 = createMultipartResumeRequest("http://localhost:3000/api/resumes", {
        token: applicant1Token,
        fileName: "New_Updated_Resume.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const uploadRes2 = await handleApiRequest(uploadReq2);
      assert.equal(uploadRes2?.status, 201);
      const uploadJson2 = await uploadRes2.json();
      const resume2Id = uploadJson2.data.id;

      // Update resume 2 parsed status
      const updatedProfile: IParsedResumeProfile = {
        ...validParsedProfile,
        skills: ["React", "TypeScript", "Next.js", "Docker", "AWS", "Kubernetes", "GraphQL", "Node.js", "Python", "Redis", "PostgreSQL"],
      };
      await resumeRepository.updateParsingStatus(resume2Id, {
        parsingStatus: "COMPLETED",
        parsedProfile: updatedProfile,
      });

      // 3. Request ATS score - should reflect newly uploaded and parsed resume
      const getReq2 = createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        token: applicant1Token,
      });
      const getRes2 = await handleApiRequest(getReq2);
      const getJson2 = await getRes2?.json();

      assert.equal(getJson2.data.resumeId, resume2Id);
      assert.equal(getJson2.data.fileName, "New_Updated_Resume.docx");
      assert.ok(getJson2.data.analysis);
      assert.equal(getJson2.data.analysis.resumeId, resume2Id);
    });
  });
});
