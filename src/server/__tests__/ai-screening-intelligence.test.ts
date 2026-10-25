import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { jobRepository } from "../repositories/job.repository.ts";
import { applicationRepository } from "../repositories/application.repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { handleApiRequest } from "../routes/index.ts";
import {
  canonicalizeSkill,
  normalizeSkillList,
  extractSkillsWithEvidence,
  calculateExperienceYears,
} from "../services/skill-taxonomy.ts";
import { jobMatcherService } from "../services/job-matcher-service.ts";
import type { IParsedResumeProfile } from "../types/resume-types.ts";
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

describe("AI RESUME SCREENING & INTELLIGENCE UPGRADE TEST SUITE", () => {
  let recruiterUser: any;
  let recruiterToken: string;
  let applicantUser1: any;
  let applicantToken1: string;
  let applicantUser2: any;
  let applicantUser3: any;
  let testJob: any;

  beforeEach(async () => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    jobRepository.clearAll();
    applicationRepository.clearAll();
    resumeRepository.resetToDefaults();

    // 1. Setup Recruiter
    recruiterUser = userRepository.createUser({
      email: "recruiter.lead@talenttrack.ai",
      name: "Lead Recruiter",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
      passwordHash: "hash123",
    });
    recruiterToken = "recruiter-token-intelligence-test";
    sessionRepository.createSession(recruiterUser.id, recruiterToken);

    // 2. Setup Applicants
    applicantUser1 = userRepository.createUser({
      email: "jane.doe@example.com",
      name: "Jane Doe",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      passwordHash: "hash123",
    });
    applicantToken1 = "applicant-token-jane-doe";
    sessionRepository.createSession(applicantUser1.id, applicantToken1);

    applicantUser2 = userRepository.createUser({
      email: "alex.smith@example.com",
      name: "Alex Smith",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      passwordHash: "hash123",
    });

    applicantUser3 = userRepository.createUser({
      email: "charlie.brown@example.com",
      name: "Charlie Brown",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      passwordHash: "hash123",
    });

    // 3. Setup Test Job
    testJob = await jobRepository.create({
      title: "Senior Full Stack Engineer (TypeScript & Cloud)",
      department: "Engineering",
      location: "San Francisco, CA",
      employmentType: "Full-Time",
      experienceRequired: "4+ years",
      description:
        "We are seeking a Senior Full Stack Engineer proficient in TypeScript, React, Node.js, and Cloud Infrastructure (AWS/Docker). Minimum 4+ years of relevant experience.",
      skills: ["React", "TypeScript", "Node.js", "Docker", "AWS", "MongoDB"],
      recruiterId: recruiterUser.id,
    });
  });

  // ==========================================
  // SECTION 1: SKILL TAXONOMY & EVIDENCE EXTRACTION
  // ==========================================
  describe("1. Skill Taxonomy, Normalization & Evidence Extraction", () => {
    it("should canonicalize aliases, abbreviations, and case variations correctly", () => {
      assert.equal(canonicalizeSkill("k8s"), "Kubernetes");
      assert.equal(canonicalizeSkill("KUBERNETES"), "Kubernetes");
      assert.equal(canonicalizeSkill("reactjs"), "React");
      assert.equal(canonicalizeSkill("React.js"), "React");
      assert.equal(canonicalizeSkill("ts"), "TypeScript");
      assert.equal(canonicalizeSkill("typescript"), "TypeScript");
      assert.equal(canonicalizeSkill("py"), "Python");
      assert.equal(canonicalizeSkill("gcp"), "GCP");
      assert.equal(canonicalizeSkill("mongo"), "MongoDB");
      assert.equal(canonicalizeSkill("postgres"), "PostgreSQL");
      assert.equal(canonicalizeSkill("tailwind"), "Tailwind CSS");
      assert.equal(canonicalizeSkill("tf"), "TensorFlow");
      assert.equal(canonicalizeSkill("rest"), "REST APIs");
      assert.equal(canonicalizeSkill("ci/cd"), "CI/CD");
    });

    it("should normalize an array of skills, deduping aliases", () => {
      const raw = ["React", "reactjs", "k8s", "Kubernetes", "TS", "TypeScript", "Node", "nodejs"];
      const normalized = normalizeSkillList(raw);
      assert.deepEqual(normalized.sort(), ["Kubernetes", "Node.js", "React", "TypeScript"].sort());
    });

    it("should extract skills with multi-category evidence citations (employment, project, certification, summary)", () => {
      const profile: IParsedResumeProfile = {
        personal: { fullName: "Test Dev" },
        summary: "Software architect passionate about Kubernetes and cloud infrastructure.",
        skills: ["React", "Docker"],
        education: [],
        experience: [
          {
            company: "Acme Corp",
            role: "Staff Engineer",
            startDate: "2021-01",
            endDate: "Present",
            description: [
              "Architected microservices using Node.js and TypeScript handling high throughput.",
            ],
            technologies: ["Node.js", "TypeScript", "MongoDB"],
          },
        ],
        projects: [
          {
            name: "Cloud Pipeline",
            description: "Automated container builds with Docker and Kubernetes.",
            technologies: ["Docker", "Kubernetes"],
          },
        ],
        certifications: [
          {
            name: "AWS Certified Solutions Architect",
            issuer: "Amazon Web Services",
          },
        ],
      };

      const extracted = extractSkillsWithEvidence(profile);
      assert.ok(extracted.size >= 5, "Should extract at least 5 distinct canonical skills");

      // Check Kubernetes evidence comes from project
      const k8sEvidence = extracted.get("kubernetes");
      assert.ok(k8sEvidence, "Kubernetes should be extracted");
      assert.equal(k8sEvidence.category, "project");
      assert.ok(k8sEvidence.evidence.includes("Cloud Pipeline"));

      // Check TypeScript evidence comes from employment
      const tsEvidence = extracted.get("typescript");
      assert.ok(tsEvidence, "TypeScript should be extracted");
      assert.equal(tsEvidence.category, "employment");
      assert.ok(tsEvidence.evidence.includes("Acme Corp"));

      // Check AWS evidence comes from certification
      const awsEvidence = extracted.get("aws");
      assert.ok(awsEvidence, "AWS should be extracted from AWS certification");
      assert.equal(awsEvidence.category, "certification");
    });

    it("should accurately calculate total relevant experience years from employment dates", () => {
      const experienceList = [
        {
          company: "Company A",
          role: "Junior Dev",
          startDate: "2020-01",
          endDate: "2022-01", // 2.0 years
        },
        {
          company: "Company B",
          role: "Senior Dev",
          startDate: "2022-02",
          endDate: "2024-02", // 2.0 years
        },
      ];

      const years = calculateExperienceYears(experienceList);
      assert.ok(years >= 4.0 && years <= 4.2, `Expected approx 4.0 years, got ${years}`);
    });
  });

  // ==========================================
  // SECTION 2: JOB MATCHING & FACTOR SCORING
  // ==========================================
  describe("2. Hybrid Job Matching, Factor Scoring & Explainability", () => {
    it("should calculate transparent factor scores and overall match score with configured weights", () => {
      const candidateProfile: IParsedResumeProfile = {
        personal: { fullName: "Senior Jane", email: "jane@test.com" },
        summary:
          "Senior Full Stack developer with extensive experience building cloud native apps.",
        skills: ["React", "TypeScript", "Node.js", "Docker", "AWS", "MongoDB"],
        experience: [
          {
            company: "TechFlow",
            role: "Senior Engineer",
            startDate: "2019-01",
            endDate: "2024-01", // 5 years
            description: ["Built enterprise Node.js microservices with React frontends on AWS."],
            technologies: ["React", "TypeScript", "Node.js", "AWS"],
          },
        ],
        projects: [
          {
            name: "Cloud Platform",
            description: "Deployed Dockerized microservices with MongoDB database.",
            technologies: ["Docker", "MongoDB"],
          },
        ],
        education: [
          {
            degree: "B.S. Computer Science",
            institution: "UC Berkeley",
          },
        ],
        certifications: [
          {
            name: "AWS Certified Solutions Architect",
            issuer: "AWS",
          },
        ],
      };

      const result = jobMatcherService.evaluateCandidateForJob(
        "cand-001",
        "Jane Doe",
        candidateProfile,
        testJob,
      );

      // Verify overall match score & tier
      assert.ok(
        result.overallScore >= 80,
        `Expected strong match score >= 80, got ${result.overallScore}`,
      );
      assert.equal(result.matchTier, "STRONG_MATCH");

      // Verify individual factor scores exist and are bounded [0, 100]
      const factors = (result.factors || result.factorScores) as any;
      assert.ok(factors.requiredSkills >= 80);
      assert.ok(factors.preferredSkills >= 50);
      assert.ok(factors.experienceScore >= 80);
      assert.ok(factors.projectRelevance >= 70);
      assert.ok(factors.educationQualifications >= 80);
      assert.ok(factors.semanticAlignment >= 70);

      // Verify factor weights match the specifications
      const weights = (result.weights || result.factorWeights) as any;
      assert.equal(weights.requiredSkills, 0.35);
      assert.equal(weights.preferredSkills, 0.15);
      assert.equal(weights.experience, 0.2);
      assert.equal(weights.projects, 0.15);
      assert.equal(weights.education, 0.1);
      assert.equal(weights.semanticAlignment, 0.05);

      // Verify overall score equals the sum of weighted factor scores
      const expectedScore = Math.round(
        factors.requiredSkills * weights.requiredSkills +
          factors.preferredSkills * weights.preferredSkills +
          factors.experienceScore * weights.experience +
          factors.projectRelevance * weights.projects +
          factors.educationQualifications * weights.education +
          factors.semanticAlignment * weights.semanticAlignment,
      );
      assert.equal(result.overallScore, expectedScore);
    });

    it("should categorize matched vs unverified vs missing skills with exact evidence citations", () => {
      const candidateProfile = {
        personal: { fullName: "Bob Junior" },
        summary: "Junior developer eager to learn cloud tools.",
        skills: ["React", "JavaScript"],
        education: [],
        projects: [],
        certifications: [],
        experience: [
          {
            company: "Startup Co",
            role: "Frontend Intern",
            startDate: "2023-01",
            endDate: "2023-08",
            description: ["Assisted in building React dashboard UI."],
            technologies: ["React"],
          },
        ],
      } as unknown as IParsedResumeProfile;

      const result = jobMatcherService.evaluateCandidateForJob(
        "cand-002",
        "Bob Junior",
        candidateProfile,
        testJob,
      );

      // React is matched
      const reactMatch = result.matchedSkills.find((s) => s.canonicalSkill === "React");
      assert.ok(reactMatch, "React should be in matched skills");
      assert.equal(reactMatch.status, "supported");
      assert.ok(Array.isArray(reactMatch.evidence) && reactMatch.evidence.length > 0);
      assert.equal((reactMatch.evidence as any)[0].category, "employment");

      // TypeScript, Docker, AWS are not found or unverified
      assert.ok(result.missingSkills.length > 0);
      const dockerMissing = result.missingSkills.find((s) => s.canonicalSkill === "Docker");
      assert.ok(dockerMissing, "Docker should be identified as missing/not found");
      assert.equal(dockerMissing.status, "not_found");
      assert.equal(dockerMissing.isMandatory, true);

      // Strengths & gaps should be populated and grounded
      assert.ok(result.strengths.length > 0);
      assert.ok(result.gaps.length > 0);
      assert.ok(
        result.gaps.some(
          (g) => g.toLowerCase().includes("docker") || g.toLowerCase().includes("experience"),
        ),
      );
    });

    it("should never state that candidate definitively lacks a skill, using unverified/not_found framing", () => {
      const profile = {
        personal: { fullName: "Test Person" },
        skills: [],
        education: [],
        experience: [],
        projects: [],
        certifications: [],
      } as unknown as IParsedResumeProfile;
      const result = jobMatcherService.evaluateCandidateForJob(
        "cand-003",
        "Test Person",
        profile,
        testJob,
      );
      for (const missing of result.missingSkills) {
        assert.ok(
          missing.status === "not_found" ||
            missing.status === "unverified" ||
            missing.status === "partially_supported",
          `Status must be nuanced, got: ${missing.status}`,
        );
        assert.ok(
          !missing.explanation?.includes("definitively lacks"),
          "Explanation must not make definitive negative claim",
        );
      }
    });
  });

  // ==========================================
  // SECTION 3: REPEATABILITY & FAIRNESS
  // ==========================================
  describe("3. Scoring Repeatability & Bias/Fairness Safeguards", () => {
    it("should be 100% repeatable with zero variance across 10 identical evaluations", () => {
      const profile = {
        personal: { fullName: "Repeatable Dev" },
        summary: "Fullstack developer with React and Node.js expertise.",
        skills: ["React", "TypeScript", "Node.js", "Docker"],
        education: [],
        projects: [],
        certifications: [],
        experience: [
          {
            company: "Repeat Corp",
            role: "Developer",
            startDate: "2021-01",
            endDate: "2024-01",
            description: ["Developed web applications using React and Node.js."],
            technologies: ["React", "Node.js"],
          },
        ],
      } as unknown as IParsedResumeProfile;

      const scores: number[] = [];
      for (let i = 0; i < 10; i++) {
        const evalResult = jobMatcherService.evaluateCandidateForJob(
          "cand-repeat",
          "Repeatable Dev",
          profile,
          testJob,
        );
        scores.push(evalResult.overallScore);
      }

      // Check standard deviation / variance is strictly 0
      const firstScore = scores[0];
      for (const score of scores) {
        assert.equal(score, firstScore, "All repeated runs must have identical match scores");
      }
    });

    it("should produce identical match scores regardless of demographic name, gender indicators, or photo markers", () => {
      const baseProfile: Omit<IParsedResumeProfile, "personal"> = {
        summary:
          "Software engineer with 5 years experience building cloud services in TypeScript and AWS.",
        skills: ["TypeScript", "React", "Node.js", "AWS", "Docker"],
        experience: [
          {
            company: "Tech Systems",
            role: "Software Engineer",
            startDate: "2019-01",
            endDate: "2024-01",
            description: ["Built cloud infrastructure with AWS and TypeScript."],
            technologies: ["TypeScript", "AWS"],
          },
        ],
        education: [
          {
            degree: "B.S. Computer Science",
            institution: "State University",
          },
        ],
        projects: [],
        certifications: [],
      };

      const profileA: IParsedResumeProfile = {
        ...baseProfile,
        personal: {
          fullName: "Emily Johnson",
          email: "emily.j@example.com",
        },
      };

      const profileB: IParsedResumeProfile = {
        ...baseProfile,
        personal: {
          fullName: "Mohammed Al-Mansoor",
          email: "mohammed.m@example.com",
        },
      };

      const profileC: IParsedResumeProfile = {
        ...baseProfile,
        personal: {
          fullName: "Priya Patel",
          email: "priya.p@example.com",
        },
      };

      const evalA = jobMatcherService.evaluateCandidateForJob(profileA, testJob);
      const evalB = jobMatcherService.evaluateCandidateForJob(profileB, testJob);
      const evalC = jobMatcherService.evaluateCandidateForJob(profileC, testJob);

      assert.equal(
        evalA.overallScore,
        evalB.overallScore,
        "Score must be completely neutral to name/background",
      );
      assert.equal(
        evalB.overallScore,
        evalC.overallScore,
        "Score must be completely neutral to name/background",
      );
      assert.deepEqual(
        evalA.factorScores,
        evalB.factorScores,
        "Factor breakdown must be identical",
      );
      assert.deepEqual(
        evalB.factorScores,
        evalC.factorScores,
        "Factor breakdown must be identical",
      );
    });
  });

  // ==========================================
  // SECTION 4: CANDIDATE RANKING & TIE-BREAKING
  // ==========================================
  describe("4. Candidate Ranking, Deterministic Tie-Breaking & Rationales", () => {
    it("should rank candidates deterministically with transparent rationales", async () => {
      const candidates = [
        {
          id: "cand-low",
          name: "Junior Candidate",
          email: "low@example.com",
          profile: {
            personal: { fullName: "Junior Candidate" },
            skills: ["HTML", "CSS"],
            experience: [],
          } as unknown as IParsedResumeProfile,
        },
        {
          id: "cand-high",
          name: "Staff Architect",
          email: "high@example.com",
          profile: {
            personal: { fullName: "Staff Architect" },
            summary: "Experienced fullstack engineer with React, TypeScript, Node.js, Docker, AWS.",
            skills: ["React", "TypeScript", "Node.js", "Docker", "AWS", "MongoDB"],
            experience: [
              {
                company: "HighScale",
                role: "Lead Engineer",
                startDate: "2018-01",
                endDate: "Present",
                description: ["Architected enterprise solutions."],
                technologies: ["React", "TypeScript", "Node.js", "AWS"],
              },
            ],
            education: [{ degree: "B.S. Computer Science" }],
          } as unknown as IParsedResumeProfile,
        },
        {
          id: "cand-mid",
          name: "Mid Engineer",
          email: "mid@example.com",
          profile: {
            personal: { fullName: "Mid Engineer" },
            skills: ["React", "TypeScript", "Node.js"],
            experience: [
              {
                company: "Startup",
                role: "Developer",
                startDate: "2021-01",
                endDate: "2023-01",
                description: ["React and Node.js features."],
                technologies: ["React", "Node.js"],
              },
            ],
          } as unknown as IParsedResumeProfile,
        },
      ];

      const ranked = await jobMatcherService.rankCandidatesForJob(testJob, candidates);

      assert.equal(ranked.length, 3);
      assert.equal(ranked[0].candidateId, "cand-high");
      assert.equal(ranked[0].rank, 1);
      assert.equal(ranked[1].candidateId, "cand-mid");
      assert.equal(ranked[1].rank, 2);
      assert.equal(ranked[2].candidateId, "cand-low");
      assert.equal(ranked[2].rank, 3);

      // Check ranking rationales
      for (const r of ranked) {
        assert.ok(r.rankingRationale.length > 10, "Ranking rationale must be descriptive");
        assert.ok(r.rankingRationale.includes(String(r.overallScore)));
      }
    });

    it("should break ties deterministically using required skills, experience, and ID", async () => {
      const tiedProfile1 = {
        personal: { fullName: "Tied Candidate A" },
        skills: ["React", "TypeScript"],
        experience: [{ company: "A", role: "Dev", startDate: "2022-01", endDate: "2024-01" }],
      } as unknown as IParsedResumeProfile;
      const tiedProfile2 = {
        personal: { fullName: "Tied Candidate B" },
        skills: ["React", "TypeScript"],
        experience: [{ company: "B", role: "Dev", startDate: "2022-01", endDate: "2024-01" }],
      } as unknown as IParsedResumeProfile;

      const candidates = [
        { id: "cand-b", name: "Tied Candidate B", email: "b@test.com", profile: tiedProfile2 },
        { id: "cand-a", name: "Tied Candidate A", email: "a@test.com", profile: tiedProfile1 },
      ];

      const ranked = await jobMatcherService.rankCandidatesForJob(testJob, candidates);
      assert.equal(ranked.length, 2);
      // Both have identical scores, deterministic tie breaker sorts by candidateId "cand-a" before "cand-b"
      assert.equal(ranked[0].candidateId, "cand-a");
      assert.equal(ranked[1].candidateId, "cand-b");
    });
  });

  // ==========================================
  // SECTION 5: SEMANTIC SEARCH
  // ==========================================
  describe("5. Semantic Talent Search", () => {
    it("should retrieve candidates matching natural language queries like 'React developers with TypeScript and cloud'", async () => {
      const candidates = [
        {
          id: "cand-cloud",
          name: "Cloud Specialist",
          email: "cloud@test.com",
          profile: {
            personal: { fullName: "Cloud Specialist" },
            skills: ["Docker", "Kubernetes", "AWS", "Terraform"],
            experience: [
              {
                company: "CloudCorp",
                role: "SRE",
                description: ["Cloud deployments and CI/CD pipelines."],
              },
            ],
          } as IParsedResumeProfile,
        },
        {
          id: "cand-fullstack",
          name: "Fullstack React TS",
          email: "fullstack@test.com",
          profile: {
            personal: { fullName: "Fullstack React TS" },
            skills: ["React", "TypeScript", "Node.js", "AWS"],
            experience: [
              {
                company: "DevCorp",
                role: "Engineer",
                description: ["Built full stack web apps with React and TypeScript."],
              },
            ],
          } as IParsedResumeProfile,
        },
        {
          id: "cand-python",
          name: "Python Data Scientist",
          email: "python@test.com",
          profile: {
            personal: { fullName: "Python Data Scientist" },
            skills: ["Python", "Pandas", "Machine Learning", "PyTorch"],
            experience: [
              {
                company: "DataCo",
                role: "Scientist",
                description: ["Trained deep learning models with PyTorch."],
              },
            ],
          } as IParsedResumeProfile,
        },
      ];

      const results = await jobMatcherService.semanticSearchCandidates(
        "React developers with TypeScript and cloud deployment experience",
        candidates,
      );

      assert.ok(results.length > 0);
      assert.equal(results[0].candidateId, "cand-fullstack");
      assert.ok(results[0].matchedTokens.includes("React"));
      assert.ok(results[0].matchedTokens.includes("TypeScript"));
      assert.ok(results[0].relevanceScore > 70);
    });

    it("should return empty results gracefully for queries with zero candidate match", async () => {
      const candidates = [
        {
          id: "cand-1",
          name: "Dev One",
          email: "one@test.com",
          profile: { personal: { fullName: "Dev One" }, skills: ["React"] } as IParsedResumeProfile,
        },
      ];
      const results = await jobMatcherService.semanticSearchCandidates(
        "Cobol and Fortran mainframe specialist",
        candidates,
      );
      assert.equal(results.length, 0);
    });
  });

  // ==========================================
  // SECTION 6: RESUME RECOMMENDATIONS
  // ==========================================
  describe("6. Resume Improvement Recommendations Grounded in Job Gaps", () => {
    it("should generate grounded, actionable recommendations without hallucinations", () => {
      const candidateProfile = {
        personal: { fullName: "Jane Starter" },
        summary: "Passionate developer.",
        skills: ["React", "JavaScript"],
        experience: [
          {
            company: "Web Lab",
            role: "Developer",
            startDate: "2023-01",
            endDate: "2023-12",
            description: ["Worked on frontend UI tasks."],
          },
        ],
      } as unknown as IParsedResumeProfile;

      const result = jobMatcherService.generateApplicantRecommendations(candidateProfile, testJob);

      assert.equal(result.jobTitle, testJob.title);
      assert.ok(result.recommendations.length > 0);

      // Verify categories
      const categories = result.recommendations.map((r) => r.category);
      assert.ok(categories.includes("skill_gap"), "Should suggest missing key skills");
      assert.ok(
        categories.includes("action_impact"),
        "Should suggest adding measurable impact to vague experience",
      );

      // Verify advisory notice is present
      assert.ok(
        result.advisoryNotice &&
          result.advisoryNotice.includes("does not guarantee interview selection"),
      );

      // Verify no hallucination of fake past employers
      for (const rec of result.recommendations) {
        assert.ok(!rec.suggestion?.includes("fake company"));
        assert.ok(rec.rationale && rec.rationale.length > 10);
      }
    });
  });

  // ==========================================
  // SECTION 7: SCREENING API ENDPOINTS & RBAC
  // ==========================================
  describe("7. Screening API Endpoints & Role Authorization", () => {
    beforeEach(async () => {
      // Create parsed resume for applicantUser1
      await resumeRepository.create({
        applicantId: applicantUser1.id,
        originalFileName: "jane-resume.pdf",
        storedFileName: "jane-resume.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        s3Key: `resumes/${applicantUser1.id}/jane-resume.pdf`,
        s3Bucket: "talenttrack-resumes",
        parsingStatus: "COMPLETED",
        parsedProfile: {
          personal: {
            fullName: "Jane Doe",
            email: "jane.doe@example.com",
            phone: "",
            location: "",
            linkedin: "",
            github: "",
            portfolio: "",
          },
          summary: "Senior Full Stack developer proficient in React, TypeScript, and Node.js.",
          skills: ["React", "TypeScript", "Node.js", "Docker", "AWS", "MongoDB"],
          education: [],
          experience: [
            {
              company: "Tech Corp",
              role: "Senior Engineer",
              location: "Remote",
              startDate: "2020-01",
              endDate: "Present",
              description: ["Engineered cloud microservices with React and TypeScript."],
              technologies: ["React", "TypeScript", "Node.js", "AWS"],
            },
          ],
          projects: [],
          certifications: [],
        },
      } as any);

      // Create applications for testJob
      await applicationRepository.create({
        applicantId: applicantUser1.id,
        jobId: testJob.id,
        currentStage: "SCREENING",
        coverLetter: "Cover letter 1",
      });
      await applicationRepository.create({
        applicantId: applicantUser2.id,
        jobId: testJob.id,
        currentStage: "APPLIED",
        coverLetter: "Cover letter 2",
      });
    });

    it("GET /api/screening/jobs/:jobId/candidates/ranked returns ranked candidates for recruiter", async () => {
      const req = createJsonRequest(
        `http://localhost/api/screening/jobs/${testJob.id}/candidates/ranked`,
        { token: recruiterToken },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = await res.json();
      const data = json.data;
      assert.equal(data.jobId, testJob.id);
      assert.ok(Array.isArray(data.candidates));
      assert.ok(data.candidates.length >= 1);

      // Verify candidate item structure
      const candidate = data.candidates[0];
      assert.ok(candidate.candidateId);
      assert.ok(typeof candidate.overallScore === "number");
      assert.ok(candidate.factors);
      assert.ok(Array.isArray(candidate.matchedSkills));
      assert.ok(Array.isArray(candidate.missingSkills));
    });

    it("GET /api/screening/jobs/:jobId/candidates/:candidateId/explanation returns explainable breakdown", async () => {
      const req = createJsonRequest(
        `http://localhost/api/screening/jobs/${testJob.id}/candidates/${applicantUser1.id}/explanation`,
        { token: recruiterToken },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = await res.json();
      const data = json.data;
      assert.ok(data.candidateId);
      assert.ok(data.explanation.overallScore !== undefined);
      assert.ok(data.explanation.factorScores);
      assert.ok(data.explanation.factorWeights);
      assert.ok(Array.isArray(data.explanation.strengths));
      assert.ok(Array.isArray(data.explanation.gaps));
      assert.ok(Array.isArray(data.explanation.limitations));
      assert.equal(data.explanation.isAiGenerated, true);
      assert.equal(data.explanation.humanReviewRequired, true);
    });

    it("GET /api/screening/search allows recruiter to semantically search candidate pool", async () => {
      const req = createJsonRequest(
        `http://localhost/api/screening/search?q=React%20TypeScript%20Node`,
        { token: recruiterToken },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = await res.json();
      const data = json.data;
      assert.equal(data.query, "React TypeScript Node");
      assert.ok(Array.isArray(data.results));
    });

    it("GET /api/screening/jobs/:jobId/recommendations provides applicant guidance", async () => {
      const req = createJsonRequest(
        `http://localhost/api/screening/jobs/${testJob.id}/recommendations`,
        { token: applicantToken1 },
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = await res.json();
      const data = json.data;
      assert.equal(data.jobTitle, testJob.title);
      assert.ok(Array.isArray(data.recommendations));
      assert.ok(data.advisoryNotice);
    });

    it("POST /api/screening/override records recruiter human review without automated rejection", async () => {
      const req = createJsonRequest(`http://localhost/api/screening/override`, {
        method: "POST",
        token: recruiterToken,
        body: {
          candidateId: applicantUser1.id,
          jobId: testJob.id,
          decision: "ADVANCE_TO_INTERVIEW",
          reason:
            "Candidate demonstrated strong practical design in offline portfolio despite minor skill name discrepancy.",
          verifiedSkills: ["TypeScript", "React", "Node.js"],
        },
      });
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      const data = json.data;
      assert.equal(data.override.decision, "ADVANCE_TO_INTERVIEW");
      assert.equal(data.override.reviewedBy, recruiterUser.id);
    });

    it("Enforces RBAC: returns 403 when applicant attempts to access recruiter screening endpoint", async () => {
      const req = createJsonRequest(
        `http://localhost/api/screening/jobs/${testJob.id}/candidates/ranked`,
        { token: applicantToken1 }, // APPLICANT role
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 403);
    });

    it("Enforces authentication: returns 401 when no token is provided", async () => {
      const req = createJsonRequest(
        `http://localhost/api/screening/jobs/${testJob.id}/candidates/ranked`,
      );
      const res = await handleApiRequest(req);
      assert.ok(res);
      assert.equal(res.status, 401);
    });
  });
});
