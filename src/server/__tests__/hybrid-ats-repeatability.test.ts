import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { atsService, computeResumeHash, computeAnalysisKey } from "../services/ats-service.ts";
import { handleApiRequest } from "../routes/index.ts";
import { validateGeminiAtsAnalysis } from "../validators/ats-validator.ts";
import { ATS_SCORING_CONFIG } from "../types/ats-types.ts";
import type { IParsedResumeProfile } from "../types/resume-types.ts";

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

describe("CONTROLLED HYBRID ATS & 10-RUN REPEATABILITY SUITE", () => {
  let applicantUser: any;
  let applicantToken: string;

  const mockParsedProfile: IParsedResumeProfile = {
    personal: {
      fullName: "Alex Rivera",
      email: "alex.rivera@example.com",
      phone: "+1-555-0199",
      location: "San Francisco, CA",
      linkedin: "https://linkedin.com/in/alexrivera",
      github: "https://github.com/alexrivera",
      portfolio: "https://alexrivera.dev",
    },
    summary:
      "Senior Full-Stack Software Engineer with 7+ years architecting scalable cloud platforms and distributed systems.",
    skills: [
      "TypeScript",
      "Node.js",
      "React",
      "PostgreSQL",
      "Redis",
      "Docker",
      "Kubernetes",
      "AWS",
      "Kafka",
      "Go",
    ],
    experience: [
      {
        company: "Stripe",
        role: "Senior Software Engineer",
        location: "San Francisco, CA",
        startDate: "2021-03",
        endDate: "Present",
        description: [
          "Engineered core payment orchestrations, reducing p99 latency by 35% through Redis caching.",
          "Led migration of 4 microservices to Kubernetes and mentored 6 junior engineers.",
        ],
        technologies: ["Node.js", "TypeScript", "Redis", "Docker", "Kubernetes", "PostgreSQL"],
      },
      {
        company: "Twilio",
        role: "Software Engineer",
        location: "San Francisco, CA",
        startDate: "2018-06",
        endDate: "2021-02",
        description: [
          "Built real-time messaging pipelines with Kafka processing 20M events daily.",
          "Maintained 99.99% uptime for WebRTC ingestion API.",
        ],
        technologies: ["Go", "Node.js", "Kafka", "AWS", "MongoDB"],
      },
    ],
    education: [
      {
        institution: "UC Berkeley",
        degree: "B.S. in Computer Science",
        fieldOfStudy: "Computer Science",
        startDate: "2014-08",
        endDate: "2018-05",
        grade: "3.85 GPA",
      },
    ],
    projects: [
      {
        name: "Distributed Task Queue",
        description: "Fault-tolerant job scheduler built with TypeScript and Redis.",
        technologies: ["TypeScript", "Redis", "Node.js"],
        url: "https://github.com/alexrivera/task-queue",
      },
    ],
    certifications: [
      {
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        date: "2022-04",
      },
    ],
    languages: ["English"],
    achievements: ["Published open-source library with 2k stars"],
  };

  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    resumeRepository.clearAll();

    applicantUser = userRepository.createUser({
      name: "Alex Rivera",
      email: "alex.rivera@example.com",
      passwordHash: "Password123!",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });

    applicantToken = "test-token-alex-rivera-123";
    sessionRepository.createSession(applicantUser.id, applicantToken);
  });

  it("1. Deterministic baseline scoring is strictly reproducible for identical profile", () => {
    const baseline1 = atsService.calculateDeterministicBaselines(mockParsedProfile);
    const baseline2 = atsService.calculateDeterministicBaselines(mockParsedProfile);

    assert.deepStrictEqual(baseline1, baseline2);
    assert.strictEqual(baseline1.completeness.score >= 80, true);
    assert.strictEqual(baseline1.skills.score >= 80, true);
    assert.strictEqual(baseline1.experience.score >= 80, true);
    assert.strictEqual(baseline1.structure.score >= 80, true);
  });

  it("2. Gemini output schema validation sanitizes and validates structured scores", () => {
    const validGeminiData = {
      skillsRelevance: { score: 92, evidence: ["Strong TypeScript and backend coverage"] },
      experienceQuality: { score: 88, evidence: ["Measurable latency reductions at Stripe"] },
      projectQuality: {
        score: 85,
        evidence: ["Distributed task queue demonstrates architecture skills"],
      },
      summaryQuality: { score: 90, evidence: ["Clear 7+ years professional trajectory"] },
      keywordRelevance: { score: 89, evidence: ["Modern stack keywords present"] },
      achievementQuality: {
        score: 87,
        evidence: ["Quantified 35% latency reduction and 20M events"],
      },
      strengths: ["Strong technical depth", "Measurable impact"],
      weaknesses: ["Could include more leadership certifications"],
      keywordInsights: ["TypeScript", "Redis", "Docker", "Node.js"],
      recommendations: ["Highlight distributed system scale even further"],
    };

    const validated = validateGeminiAtsAnalysis(validGeminiData);
    assert.ok(validated);
    assert.strictEqual(validated.skillsRelevance?.score, 92);
    assert.strictEqual(validated.experienceQuality?.score, 88);

    // Negative score gets clamped into valid 0-100 boundary by validator
    const invalidNegative = {
      ...validGeminiData,
      skillsRelevance: { score: -5, evidence: ["Negative"] },
    };
    const clampedNeg = validateGeminiAtsAnalysis(invalidNegative);
    assert.strictEqual(clampedNeg.skillsRelevance?.score >= 0, true);

    // >100 score gets clamped into 100 boundary
    const invalidExceeding = {
      ...validGeminiData,
      experienceQuality: { score: 150, evidence: ["Too high"] },
    };
    const clampedOver = validateGeminiAtsAnalysis(invalidExceeding);
    assert.strictEqual(clampedOver.experienceQuality?.score <= 100, true);
  });

  it("3. Analysis key is cryptographically stable & deterministic (SHA-256)", () => {
    const hash1 = computeResumeHash(mockParsedProfile);
    const hash2 = computeResumeHash(mockParsedProfile);
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64); // sha256 hex length

    const key1 = computeAnalysisKey(hash1);
    const key2 = computeAnalysisKey(hash1);
    assert.strictEqual(key1, key2);
    assert.strictEqual(key1.length, 64);

    // Altering profile alters hash and key
    const modifiedProfile: IParsedResumeProfile = {
      ...mockParsedProfile,
      skills: [...(mockParsedProfile.skills || []), "GraphQL"],
    };
    const modifiedHash = computeResumeHash(modifiedProfile);
    assert.notStrictEqual(modifiedHash, hash1);
  });

  it("4. Critical Repeatability: 10 repeated analyses produce identical numerical scores and category breakdowns", async () => {
    const resume = await resumeRepository.create({
      applicantId: applicantUser.id,
      originalFileName: "Alex_Rivera_Resume.pdf",
      storedFileName: "alex-uuid-123.pdf",
      mimeType: "application/pdf",
      fileSize: 10240,
      s3Key: "resumes/alex/alex-uuid-123.pdf",
      s3Bucket: "talenttrack-resumes",
    });

    await resumeRepository.updateParsingStatus(resume.id, {
      parsingStatus: "COMPLETED",
      parsedProfile: mockParsedProfile,
      parsedAt: new Date().toISOString(),
    });

    const results: any[] = [];

    // Run 1 to 10
    for (let run = 1; run <= 10; run++) {
      const response = await handleApiRequest(
        createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
          method: "GET",
          token: applicantToken,
        }),
      );

      assert.ok(response, `Run ${run} response exists`);
      assert.strictEqual(response.status, 200, `Run ${run} should return HTTP 200`);
      const body: any = await response.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data?.analysis?.overallScore !== undefined);
      results.push(body.data.analysis);
    }

    // Verify Run 1 == Run 2 == ... == Run 10
    const firstRun = results[0];
    assert.strictEqual(results.length, 10);

    for (let i = 1; i < 10; i++) {
      const current = results[i];
      assert.strictEqual(
        current.overallScore,
        firstRun.overallScore,
        `Run ${i + 1} overallScore (${current.overallScore}) matches Run 1 (${firstRun.overallScore})`,
      );
      assert.strictEqual(
        current.compatibilityTier,
        firstRun.compatibilityTier,
        `Run ${i + 1} compatibilityTier matches Run 1`,
      );
      assert.strictEqual(
        current.categories.length,
        firstRun.categories.length,
        `Run ${i + 1} categories count matches Run 1`,
      );

      for (let c = 0; c < firstRun.categories.length; c++) {
        assert.strictEqual(
          current.categories[c].score,
          firstRun.categories[c].score,
          `Run ${i + 1} category '${current.categories[c].name}' score (${current.categories[c].score}) matches Run 1 (${firstRun.categories[c].score})`,
        );
        assert.strictEqual(
          current.categories[c].deterministicScore,
          firstRun.categories[c].deterministicScore,
          `Run ${i + 1} category '${current.categories[c].name}' deterministicScore matches Run 1`,
        );
        assert.strictEqual(
          current.categories[c].geminiScore,
          firstRun.categories[c].geminiScore,
          `Run ${i + 1} category '${current.categories[c].name}' geminiScore matches Run 1`,
        );
      }
    }
  });

  it("5. Re-analyze API endpoint returns existing cached analysis idempotently", async () => {
    const resume = await resumeRepository.create({
      applicantId: applicantUser.id,
      originalFileName: "Alex_Rivera_Resume.pdf",
      storedFileName: "alex-uuid-123.pdf",
      mimeType: "application/pdf",
      fileSize: 10240,
      s3Key: "resumes/alex/alex-uuid-123.pdf",
      s3Bucket: "talenttrack-resumes",
    });

    await resumeRepository.updateParsingStatus(resume.id, {
      parsingStatus: "COMPLETED",
      parsedProfile: mockParsedProfile,
      parsedAt: new Date().toISOString(),
    });

    // Initial analysis
    const initRes = await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        method: "GET",
        token: applicantToken,
      }),
    );
    assert.ok(initRes);
    const initData = ((await initRes.json()) as any).data.analysis;

    // POST /api/applicant/ats-score/analyze
    const reanalyzeRes = await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/ats-score/analyze", {
        method: "POST",
        token: applicantToken,
      }),
    );
    assert.ok(reanalyzeRes);
    assert.strictEqual(reanalyzeRes.status, 200);
    const reanalyzeData = ((await reanalyzeRes.json()) as any).data.analysis;

    assert.strictEqual(reanalyzeData.overallScore, initData.overallScore);
    assert.strictEqual(reanalyzeData.analysisKey, initData.analysisKey);
    assert.strictEqual(reanalyzeData.analysisVersion, 1);
  });

  it("6. Resume replacement invalidates previous ATS analysis and produces fresh analysis", async () => {
    // Initial Resume
    const resumeA = await resumeRepository.create({
      applicantId: applicantUser.id,
      originalFileName: "Alex_Resume_A.pdf",
      storedFileName: "alex-a-uuid.pdf",
      mimeType: "application/pdf",
      fileSize: 10240,
      s3Key: "resumes/alex/a.pdf",
      s3Bucket: "talenttrack-resumes",
    });

    await resumeRepository.updateParsingStatus(resumeA.id, {
      parsingStatus: "COMPLETED",
      parsedProfile: mockParsedProfile,
      parsedAt: new Date().toISOString(),
    });

    const resA = await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        method: "GET",
        token: applicantToken,
      }),
    );
    assert.ok(resA);
    const dataA = ((await resA.json()) as any).data.analysis;

    // Replace with a junior profile (Resume B)
    const juniorProfile: IParsedResumeProfile = {
      personal: {
        fullName: "Alex Rivera",
        email: "alex.rivera@example.com",
        phone: "",
        location: "",
        linkedin: "",
        github: "",
        portfolio: "",
      },
      skills: ["HTML", "CSS"],
      education: [
        {
          institution: "High School",
          degree: "Diploma",
          fieldOfStudy: "General",
          startDate: "",
          endDate: "",
          grade: "",
        },
      ],
      summary: "",
      experience: [],
      projects: [],
      certifications: [],
      languages: ["English"],
      achievements: [],
    };

    const resumeB = await resumeRepository.create({
      applicantId: applicantUser.id,
      originalFileName: "Alex_Resume_B.pdf",
      storedFileName: "alex-b-uuid.pdf",
      mimeType: "application/pdf",
      fileSize: 5000,
      s3Key: "resumes/alex/b.pdf",
      s3Bucket: "talenttrack-resumes",
    });

    await resumeRepository.updateParsingStatus(resumeB.id, {
      parsingStatus: "COMPLETED",
      parsedProfile: juniorProfile,
      parsedAt: new Date().toISOString(),
    });

    const resB = await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        method: "GET",
        token: applicantToken,
      }),
    );
    assert.ok(resB);
    const dataB = ((await resB.json()) as any).data.analysis;

    assert.notStrictEqual(dataB.resumeId, dataA.resumeId);
    assert.notStrictEqual(dataB.analysisKey, dataA.analysisKey);
    assert.strictEqual(
      dataB.overallScore < dataA.overallScore,
      true,
      "Junior profile should receive lower ATS score",
    );
  });

  it("7. Auditing & metadata are correctly persisted with versions", async () => {
    const resume = await resumeRepository.create({
      applicantId: applicantUser.id,
      originalFileName: "Alex_Rivera_Resume.pdf",
      storedFileName: "alex-uuid-123.pdf",
      mimeType: "application/pdf",
      fileSize: 10240,
      s3Key: "resumes/alex/alex-uuid-123.pdf",
      s3Bucket: "talenttrack-resumes",
    });

    await resumeRepository.updateParsingStatus(resume.id, {
      parsingStatus: "COMPLETED",
      parsedProfile: mockParsedProfile,
      parsedAt: new Date().toISOString(),
    });

    const res = await handleApiRequest(
      createJsonRequest("http://localhost:3000/api/applicant/ats-score", {
        method: "GET",
        token: applicantToken,
      }),
    );
    assert.ok(res);
    const data = ((await res.json()) as any).data.analysis;

    assert.strictEqual(data.rubricVersion, ATS_SCORING_CONFIG.rubricVersion);
    assert.strictEqual(data.engineVersion, ATS_SCORING_CONFIG.engineVersion);
    assert.strictEqual(data.promptVersion, ATS_SCORING_CONFIG.promptVersion);
    assert.ok(data.geminiModel);
    assert.ok(data.resumeHash);
    assert.ok(data.analysisKey);
    assert.strictEqual(data.analysisVersion, 1);
  });
});
