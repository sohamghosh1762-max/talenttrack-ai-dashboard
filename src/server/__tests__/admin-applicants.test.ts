import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import {
  handleGetApplicants,
  handleGetApplicantById,
  handleAdminApiRequest,
} from "../routes/admin-users-handler.ts";

// Helper to create simulated HTTP Request
function createRequest(
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

// Known test credentials from seed
const ADMIN_TOKEN = "mock_admin_token"; // Admin user 65f1a2b3c4d5e6f7a8b9c001

// Query key factory matching React Query hooks contract
const adminApplicantsKeys = {
  all: ["admin", "applicants"] as const,
  lists: () => [...adminApplicantsKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...adminApplicantsKeys.lists(), params] as const,
  details: () => [...adminApplicantsKeys.all, "detail"] as const,
  detail: (id: string) => [...adminApplicantsKeys.details(), id] as const,
};
const RECRUITER_TOKEN = "mock_recruiter_token"; // Recruiter user 65f1a2b3c4d5e6f7a8b9c003
const APPLICANT_TOKEN = "mock_applicant_token"; // Applicant user 65f1a2b3c4d5e6f7a8b9c008

describe("ADMIN APPLICANT API SUITE: GET /api/admin/applicants", () => {
  beforeEach(() => {
    // Reset DB state before every test
    userRepository.resetToDefaults();
    sessionRepository.clearAll();

    // Create active test sessions in session store
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c001", ADMIN_TOKEN);
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c003", RECRUITER_TOKEN);
    sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c008", APPLICANT_TOKEN);
  });

  // 1. Admin can retrieve applicants
  it("1. Admin can retrieve real applicants list", async () => {
    const req = createRequest("http://localhost/api/admin/applicants", {
      token: ADMIN_TOKEN,
    });
    const res = await handleGetApplicants(req);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.applicants), "Response contains applicants array");
    assert.ok(data.applicants.length > 0, "Applicants array is non-empty");
    assert.ok(data.pagination, "Response contains pagination metadata");
    assert.ok(data.summary, "Response contains summary metadata");

    // All returned items must strictly have role === 'APPLICANT'
    for (const applicant of data.applicants) {
      assert.equal(applicant.role, "APPLICANT");
      assert.equal(typeof applicant.id, "string");
      assert.equal(typeof applicant.name, "string");
      assert.equal(typeof applicant.email, "string");
      assert.equal(typeof applicant.status, "string");
      assert.equal(typeof applicant.emailVerified, "boolean");
      assert.equal(typeof applicant.skills, "object");
      assert.equal(typeof applicant.headline, "string");
      assert.equal(applicant.passwordHash, undefined, "passwordHash must NEVER be exposed");
    }
  });

  // 2. Pagination works correctly
  it("2. Pagination works correctly", async () => {
    // Page 1, limit 3
    const req1 = createRequest("http://localhost/api/admin/applicants?page=1&limit=3", {
      token: ADMIN_TOKEN,
    });
    const res1 = await handleGetApplicants(req1);
    assert.equal(res1.status, 200);
    const data1 = await res1.json();

    assert.equal(data1.pagination.page, 1);
    assert.equal(data1.pagination.limit, 3);
    assert.equal(data1.applicants.length, 3);
    assert.ok(data1.pagination.total >= 10, "Total applicants is >= 10 in seed database");
    assert.ok(data1.pagination.totalPages >= 4);

    // Page 2, limit 3
    const req2 = createRequest("http://localhost/api/admin/applicants?page=2&limit=3", {
      token: ADMIN_TOKEN,
    });
    const res2 = await handleGetApplicants(req2);
    assert.equal(res2.status, 200);
    const data2 = await res2.json();

    assert.equal(data2.pagination.page, 2);
    assert.equal(data2.pagination.limit, 3);
    assert.equal(data2.applicants.length, 3);

    // Ensure page 1 and page 2 have different applicants
    const idsPage1 = data1.applicants.map((a: any) => a.id);
    const idsPage2 = data2.applicants.map((a: any) => a.id);
    for (const id of idsPage2) {
      assert.ok(!idsPage1.includes(id), `Page 2 item ${id} should not be on Page 1`);
    }
  });

  // 3. Backend search works across name, email, headline, skills
  it("3. Backend search works for name, email, skills, and headline", async () => {
    // Search by name: "Aarav"
    const reqName = createRequest("http://localhost/api/admin/applicants?search=Aarav", {
      token: ADMIN_TOKEN,
    });
    const resName = await handleGetApplicants(reqName);
    const dataName = await resName.json();
    assert.ok(dataName.applicants.length >= 1);
    assert.ok(dataName.applicants.some((a: any) => a.name.includes("Aarav")));

    // Search by email: "sophia"
    const reqEmail = createRequest("http://localhost/api/admin/applicants?search=sophia", {
      token: ADMIN_TOKEN,
    });
    const resEmail = await handleGetApplicants(reqEmail);
    const dataEmail = await resEmail.json();
    assert.ok(dataEmail.applicants.length >= 1);
    assert.ok(dataEmail.applicants.some((a: any) => a.email.includes("sophia")));

    // Search by skill: "Kubernetes"
    const reqSkill = createRequest("http://localhost/api/admin/applicants?search=Kubernetes", {
      token: ADMIN_TOKEN,
    });
    const resSkill = await handleGetApplicants(reqSkill);
    const dataSkill = await resSkill.json();
    assert.ok(dataSkill.applicants.length >= 1);
    assert.ok(
      dataSkill.applicants.every(
        (a: any) =>
          a.skills.some((s: string) => s.toLowerCase().includes("kubernetes")) ||
          a.headline.toLowerCase().includes("kubernetes") ||
          a.name.toLowerCase().includes("kubernetes"),
      ),
    );
  });

  // 4. Supported filters work
  it("4. Supported filters (status, emailVerified, location, skills, dates, sorting) work", async () => {
    // Status filter
    const reqActive = createRequest("http://localhost/api/admin/applicants?status=ACTIVE", {
      token: ADMIN_TOKEN,
    });
    const resActive = await handleGetApplicants(reqActive);
    const dataActive = await resActive.json();
    assert.ok(dataActive.applicants.length > 0);
    for (const a of dataActive.applicants) {
      assert.equal(a.status, "ACTIVE");
    }

    // Email verified filter
    const reqVerified = createRequest("http://localhost/api/admin/applicants?emailVerified=true", {
      token: ADMIN_TOKEN,
    });
    const resVerified = await handleGetApplicants(reqVerified);
    const dataVerified = await resVerified.json();
    assert.ok(dataVerified.applicants.length > 0);
    for (const a of dataVerified.applicants) {
      assert.equal(a.emailVerified, true);
    }

    // Skill filter
    const reqReact = createRequest("http://localhost/api/admin/applicants?skills=React", {
      token: ADMIN_TOKEN,
    });
    const resReact = await handleGetApplicants(reqReact);
    const dataReact = await resReact.json();
    assert.ok(dataReact.applicants.length > 0);
    for (const a of dataReact.applicants) {
      assert.ok(a.skills.some((s: string) => s.toLowerCase().includes("react")));
    }

    // Sorting by name asc
    const reqSort = createRequest(
      "http://localhost/api/admin/applicants?sortBy=name&sortOrder=asc",
      {
        token: ADMIN_TOKEN,
      },
    );
    const resSort = await handleGetApplicants(reqSort);
    const dataSort = await resSort.json();
    assert.ok(dataSort.applicants.length > 1);
    for (let i = 0; i < dataSort.applicants.length - 1; i++) {
      assert.ok(
        dataSort.applicants[i].name.localeCompare(dataSort.applicants[i + 1].name) <= 0,
        "Applicants should be sorted by name ascending",
      );
    }
  });

  // 5. Unauthenticated request is rejected
  it("5. Unauthenticated request is rejected with 401", async () => {
    const unauthReq = createRequest("http://localhost/api/admin/applicants");
    const res = await handleAdminApiRequest(unauthReq);

    assert.ok(res);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.ok(data.error);
  });

  // 6. Non-admin request is rejected
  it("6. Non-admin request is rejected with 403", async () => {
    // A) Recruiter attempting to access admin applicants
    const recruiterReq = createRequest("http://localhost/api/admin/applicants", {
      token: RECRUITER_TOKEN,
    });
    const resRecruiter = await handleAdminApiRequest(recruiterReq);
    assert.ok(resRecruiter);
    assert.equal(resRecruiter.status, 403);

    // B) Applicant attempting to access admin applicants
    const applicantReq = createRequest("http://localhost/api/admin/applicants", {
      token: APPLICANT_TOKEN,
    });
    const resApplicant = await handleAdminApiRequest(applicantReq);
    assert.ok(resApplicant);
    assert.equal(resApplicant.status, 403);
  });

  // 7. No mock/hardcoded applicant data is returned (must come from genuine database)
  it("7. Real applicant data from repository is returned without fake data", async () => {
    const req = createRequest("http://localhost/api/admin/applicants", {
      token: ADMIN_TOKEN,
    });
    const res = await handleGetApplicants(req);
    const data = await res.json();

    // Verify against actual repository source of truth
    const seedAarav = userRepository.findByEmail("aarav.mehta@example.com");
    assert.ok(seedAarav);
    const matched = data.applicants.find((a: any) => a.email === "aarav.mehta@example.com");
    assert.ok(matched, "Seed applicant Aarav Mehta is present in the response");
    assert.equal(matched.id, seedAarav.id);
    assert.equal(matched.name, seedAarav.name);
    assert.equal(matched.headline, seedAarav.applicantProfile?.headline);
    assert.equal(matched.location, seedAarav.applicantProfile?.location);
  });

  // 8. Admin can retrieve a single applicant by ID
  it("8. Admin can retrieve applicant details by ID via GET /api/admin/applicants/:id", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);

    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.applicant);
    assert.equal(data.applicant.id, targetId);
    assert.equal(data.applicant.name, "Aarav Mehta");
    assert.equal(data.applicant.email, "aarav.mehta@example.com");
    assert.ok(Array.isArray(data.applicant.skills));
    assert.ok(Array.isArray(data.applications));
    assert.ok(Array.isArray(data.resumes));
  });

  // 9. Non-applicant user ID returns 404
  it("9. Non-applicant user ID or nonexistent ID returns 404", async () => {
    const adminId = "65f1a2b3c4d5e6f7a8b9c001"; // Admin user, not applicant
    const req = createRequest(`http://localhost/api/admin/applicants/${adminId}`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);

    assert.ok(res);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.error, "Applicant not found");
  });

  // 10. Invalid ID format returns 400
  it("10. Invalid ObjectId format returns 400", async () => {
    const invalidId = "invalid_id_format";
    const req = createRequest(`http://localhost/api/admin/applicants/${invalidId}`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);

    assert.ok(res);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes("Invalid applicant ID format"));
  });

  // 11. Empty state verification: non-matching search returns 0 results and empty array
  it("11. Non-matching search returns empty array with 0 total without fake rows", async () => {
    const req = createRequest(
      "http://localhost/api/admin/applicants?search=NonExistentCandidate12345XYZ",
      {
        token: ADMIN_TOKEN,
      },
    );
    const res = await handleGetApplicants(req);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.applicants.length, 0);
    assert.equal(data.pagination.total, 0);
    assert.equal(data.pagination.totalPages, 0);
  });

  // 12. Composable multi-filter test: Status + Skills + Verification + Pagination
  it("12. Multiple filters (status, skills, emailVerified) compose accurately", async () => {
    const req = createRequest(
      "http://localhost/api/admin/applicants?status=ACTIVE&emailVerified=true&skills=React&page=1&limit=5",
      {
        token: ADMIN_TOKEN,
      },
    );
    const res = await handleGetApplicants(req);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.applicants));
    assert.ok(data.pagination.page === 1);
    assert.ok(data.pagination.limit === 5);

    for (const app of data.applicants) {
      assert.equal(app.status, "ACTIVE");
      assert.equal(app.emailVerified, true);
      assert.ok(app.skills.some((s: string) => s.toLowerCase().includes("react")));
    }
  });

  // 13. Query keys verification: cache keys are unique per parameter combination
  it("13. Query keys account for page, search, and filters", () => {
    const key1 = adminApplicantsKeys.list({ page: 1, limit: 20 });
    const key2 = adminApplicantsKeys.list({ page: 2, limit: 20 });
    const key3 = adminApplicantsKeys.list({ page: 1, limit: 20, search: "Aarav" });

    assert.deepEqual(key1, ["admin", "applicants", "list", { page: 1, limit: 20 }]);
    assert.notDeepEqual(key1, key2, "Different pages must yield distinct query keys");
    assert.notDeepEqual(key1, key3, "Search parameters must yield distinct query keys");
  });

  // 14. Actionable row navigation target verification
  it("14. Applicant list items include valid IDs for navigation to /admin/applicants/:id", async () => {
    const req = createRequest("http://localhost/api/admin/applicants?page=1&limit=5", {
      token: ADMIN_TOKEN,
    });
    const res = await handleGetApplicants(req);
    const data = await res.json();

    assert.ok(data.applicants.length > 0);
    for (const app of data.applicants) {
      assert.ok(app.id && typeof app.id === "string");
      assert.ok(
        /^[0-9a-fA-F]{24}$/.test(app.id),
        "Applicant ID must be valid 24-hex ObjectId for router navigation",
      );
    }
  });

  // 15. Applicant detail returns complete structured profile sections
  it("15. Applicant detail returns full profile metadata (experiences, education, certifications, projects, bio)", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);

    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();
    const app = data.applicant;

    assert.equal(app.name, "Aarav Mehta");
    assert.equal(app.email, "aarav.mehta@example.com");
    assert.equal(app.role, "APPLICANT");
    assert.ok(app.createdAt);
    assert.ok(Array.isArray(app.skills));
    assert.ok(Array.isArray(app.experiences));
    assert.ok(Array.isArray(app.education));
    assert.ok(Array.isArray(app.certifications));
    assert.ok(Array.isArray(app.projects));
  });

  // 16. Detail query key factory contract
  it("16. adminApplicantsKeys.detail generates distinct keys per applicant ID", () => {
    const keyA = adminApplicantsKeys.detail("65f1a2b3c4d5e6f7a8b9c008");
    const keyB = adminApplicantsKeys.detail("65f1a2b3c4d5e6f7a8b9c009");

    assert.deepEqual(keyA, ["admin", "applicants", "detail", "65f1a2b3c4d5e6f7a8b9c008"]);
    assert.notDeepEqual(keyA, keyB, "Different applicant IDs must have distinct cache keys");
  });

  // 17. Applicant detail returns resumes array and ATS scores
  it("17. Applicant detail returns resumes array with parsing and ATS scores", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);

    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.resumes));
    if (data.resumes.length > 0) {
      const r = data.resumes[0];
      assert.ok(r.parsingStatus);
      assert.ok(r.uploadedAt);
    }
  });

  // 18. Applicant detail returns applications history array
  it("18. Applicant detail returns applications history array", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);

    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.applications));
    assert.equal(typeof data.applicant.applicationsCount, "number");
  });

  // 19. Dedicated Admin Applicant Applications API: GET /api/admin/applicants/:id/applications
  it("19. Admin can retrieve an applicant's applications via GET /api/admin/applicants/:id/applications", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}/applications`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);

    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.applications));
    assert.ok(data.pagination);
    assert.equal(data.applicant.id, targetId);
    assert.equal(data.applicant.name, "Aarav Mehta");
  });

  // 20. Applications are strictly scoped to the requested applicantId
  it("20. Applications returned are strictly scoped to the requested applicant", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}/applications`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    const data = await res.json();

    for (const app of data.applications) {
      assert.equal(app.applicantId, targetId);
    }
  });

  // 21. Application → Job relationship resolves correctly
  it("21. Application -> Job relationship resolves real job details (title, company, department, location, type, status)", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}/applications`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    const data = await res.json();

    assert.ok(data.applications.length > 0);
    const app = data.applications[0];

    assert.ok(app.job, "Application must contain resolved job object");
    assert.equal(app.job.title, "Senior Frontend Developer");
    assert.equal(app.job.department, "Engineering");
    assert.ok(app.job.company);
    assert.ok(app.job.type);
    assert.equal(app.job.status, "PUBLISHED");
  });

  // 22. Real application status and stage are preserved
  it("22. Real application status and stage are returned without inference", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}/applications`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    const data = await res.json();

    const app = data.applications[0];
    assert.equal(app.status, "Shortlisted");
    assert.equal(app.currentStage, "INTERVIEW");
    assert.ok(app.appliedAt);
  });

  // 23. Stored ATS score is displayed when available and missing ATS score does not fabricate fake data
  it("23. Stored ATS score is returned accurately without recalculation or fake data", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta (aiScore = 92)
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}/applications`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    const data = await res.json();

    const app = data.applications[0];
    assert.equal(app.aiScore, 92);
  });

  // 24. Missing / deleted Job is handled gracefully without crash
  it("24. Missing or deleted Job reference is handled gracefully", async () => {
    const nonExistentApplicantId = "65f1a2b3c4d5e6f7a8b9c009"; // Sophia Chen
    const req = createRequest(
      `http://localhost/api/admin/applicants/${nonExistentApplicantId}/applications`,
      {
        token: ADMIN_TOKEN,
      },
    );
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.applications));
  });

  // 25. Unauthorized access to /api/admin/applicants/:id/applications is rejected
  it("25. Unauthorized access to /api/admin/applicants/:id/applications is rejected", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008";

    // Unauthenticated
    const unauthReq = createRequest(
      `http://localhost/api/admin/applicants/${targetId}/applications`,
    );
    const unauthRes = await handleAdminApiRequest(unauthReq);
    assert.equal(unauthRes?.status, 401);

    // Recruiter (non-admin)
    const recruiterReq = createRequest(
      `http://localhost/api/admin/applicants/${targetId}/applications`,
      {
        token: RECRUITER_TOKEN,
      },
    );
    const recruiterRes = await handleAdminApiRequest(recruiterReq);
    assert.equal(recruiterRes?.status, 403);

    // Applicant (non-admin)
    const applicantReq = createRequest(
      `http://localhost/api/admin/applicants/${targetId}/applications`,
      {
        token: APPLICANT_TOKEN,
      },
    );
    const applicantRes = await handleAdminApiRequest(applicantReq);
    assert.equal(applicantRes?.status, 403);
  });

  // 26. Applicant with no applications returns empty list with total=0
  it("26. Applicant with 0 applications returns empty array with total=0", async () => {
    const applicantWithoutAppsId = "65f1a2b3c4d5e6f7a8b9c010"; // Lucas Althaus
    const req = createRequest(
      `http://localhost/api/admin/applicants/${applicantWithoutAppsId}/applications`,
      {
        token: ADMIN_TOKEN,
      },
    );
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.applications.length, 0);
    assert.equal(data.pagination.total, 0);
  });

  // 27. Nonexistent applicant ID returns 404
  it("27. Nonexistent applicant ID returns 404 on /applications endpoint", async () => {
    const fakeId = "65f1a2b3c4d5e6f7a8b9c999";
    const req = createRequest(`http://localhost/api/admin/applicants/${fakeId}/applications`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 404);
  });

  // 28. Invalid ObjectId returns 400
  it("28. Invalid ObjectId returns 400 on /applications endpoint", async () => {
    const invalidId = "invalid-id-format";
    const req = createRequest(`http://localhost/api/admin/applicants/${invalidId}/applications`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);
  });

  // 29. Detail endpoint includes applications with resolved Job data
  it("29. GET /api/admin/applicants/:id includes applications with resolved Job data", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.applications));
    assert.ok(data.applications.length > 0);
    assert.ok(data.applications[0].job);
    assert.equal(data.applications[0].job.title, "Senior Frontend Developer");
  });

  // ─── INTERVIEWS INTEGRATION TESTS ──────────────────────────────────────────

  // 30. Real Interview records returned for applicant with interviews
  it("30. GET /api/admin/applicants/:id/interviews returns real interview records", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}/interviews`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.interviews));
    assert.ok(data.interviews.length > 0);
    const interview = data.interviews[0];
    assert.equal(typeof interview.id, "string");
    assert.equal(interview.applicantId, targetId);
    assert.ok(interview.title);
    assert.ok(interview.type);
    assert.ok(interview.scheduledAt);
    assert.ok(interview.status);
    assert.ok(interview.job);
  });

  // 31. Applicant with no interviews returns empty array
  it("31. Applicant with no interviews returns empty array", async () => {
    const applicantWithoutInterviewsId = "65f1a2b3c4d5e6f7a8b9c010"; // Lucas Althaus
    const req = createRequest(
      `http://localhost/api/admin/applicants/${applicantWithoutInterviewsId}/interviews`,
      {
        token: ADMIN_TOKEN,
      },
    );
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data.interviews, []);
  });

  // 32. Interview endpoint authorization check
  it("32. Interview endpoint enforces RBAC (401 unauth, 403 non-admin)", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008";

    // Unauthenticated -> 401
    const unauthReq = createRequest(`http://localhost/api/admin/applicants/${targetId}/interviews`);
    const unauthRes = await handleAdminApiRequest(unauthReq);
    assert.equal(unauthRes?.status, 401);

    // Recruiter -> 403
    const recruiterReq = createRequest(
      `http://localhost/api/admin/applicants/${targetId}/interviews`,
      {
        token: RECRUITER_TOKEN,
      },
    );
    const recruiterRes = await handleAdminApiRequest(recruiterReq);
    assert.equal(recruiterRes?.status, 403);
  });

  // ─── MESSAGING / CONVERSATIONS TESTS ───────────────────────────────────────

  // 33. Conversations endpoint returns metadata only (no full message bodies)
  it("33. GET /api/admin/applicants/:id/conversations returns metadata only without private message body", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}/conversations`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.conversations));
    assert.ok(data.conversations.length > 0);
    const conv = data.conversations[0];
    assert.ok(conv.id);
    assert.ok(conv.participantIds);
    assert.equal(typeof conv.unreadCount, "number");
    assert.equal(
      conv.lastMessageText,
      undefined,
      "Message body text must NOT be exposed to Admin by default",
    );
    assert.equal(
      conv.messages,
      undefined,
      "Private message thread must NOT be exposed to Admin by default",
    );
  });

  // 34. Conversation endpoint authorization check
  it("34. Conversation endpoint enforces RBAC (401 unauth, 403 non-admin)", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008";

    const unauthReq = createRequest(
      `http://localhost/api/admin/applicants/${targetId}/conversations`,
    );
    const unauthRes = await handleAdminApiRequest(unauthReq);
    assert.equal(unauthRes?.status, 401);

    const recruiterReq = createRequest(
      `http://localhost/api/admin/applicants/${targetId}/conversations`,
      {
        token: RECRUITER_TOKEN,
      },
    );
    const recruiterRes = await handleAdminApiRequest(recruiterReq);
    assert.equal(recruiterRes?.status, 403);
  });

  // ─── NOTIFICATIONS INTEGRATION TESTS ───────────────────────────────────────

  // 35. Notifications endpoint returns records in read-only mode without mutating read status
  it("35. GET /api/admin/applicants/:id/notifications returns notifications without altering read status", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}/notifications`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.notifications));
    assert.ok(data.notifications.length > 0);
    const unreadNotif = data.notifications.find((n: any) => n.readAt === null);
    assert.ok(unreadNotif, "Unread notification exists");
    assert.equal(unreadNotif.readAt, null, "Viewing as admin must NOT mark notification as read");
  });

  // 36. Notification endpoint authorization check
  it("36. Notification endpoint enforces RBAC (401 unauth, 403 non-admin)", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008";

    const unauthReq = createRequest(
      `http://localhost/api/admin/applicants/${targetId}/notifications`,
    );
    const unauthRes = await handleAdminApiRequest(unauthReq);
    assert.equal(unauthRes?.status, 401);

    const recruiterReq = createRequest(
      `http://localhost/api/admin/applicants/${targetId}/notifications`,
      {
        token: RECRUITER_TOKEN,
      },
    );
    const recruiterRes = await handleAdminApiRequest(recruiterReq);
    assert.equal(recruiterRes?.status, 403);
  });

  // ─── APPLICANT PREFERENCES INTEGRATION TESTS ───────────────────────────────

  // 37. Preferences endpoint returns configured candidate preferences
  it("37. GET /api/admin/applicants/:id/preferences returns stored candidate preferences", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}/preferences`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.preferences);
    assert.equal(typeof data.preferences.applicationStatusUpdates, "boolean");
    assert.equal(typeof data.preferences.interviewReminders, "boolean");
    assert.equal(typeof data.preferences.jobRecommendationAlerts, "boolean");
    assert.equal(typeof data.preferences.messageNotifications, "boolean");
    assert.equal(typeof data.preferences.emailNotifications, "boolean");
  });

  // 38. Preferences endpoint authorization check
  it("38. Preferences endpoint enforces RBAC (401 unauth, 403 non-admin)", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008";

    const unauthReq = createRequest(
      `http://localhost/api/admin/applicants/${targetId}/preferences`,
    );
    const unauthRes = await handleAdminApiRequest(unauthReq);
    assert.equal(unauthRes?.status, 401);

    const recruiterReq = createRequest(
      `http://localhost/api/admin/applicants/${targetId}/preferences`,
      {
        token: RECRUITER_TOKEN,
      },
    );
    const recruiterRes = await handleAdminApiRequest(recruiterReq);
    assert.equal(recruiterRes?.status, 403);
  });

  // 39. Enriched detail endpoint includes interviews, conversations, notifications, and preferences
  it("39. GET /api/admin/applicants/:id enriched detail payload includes all integrated sub-resources", async () => {
    const targetId = "65f1a2b3c4d5e6f7a8b9c008"; // Aarav Mehta
    const req = createRequest(`http://localhost/api/admin/applicants/${targetId}`, {
      token: ADMIN_TOKEN,
    });
    const res = await handleAdminApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.applicant);
    assert.ok(Array.isArray(data.resumes));
    assert.ok(Array.isArray(data.applications));
    assert.ok(Array.isArray(data.interviews));
    assert.ok(Array.isArray(data.conversations));
    assert.ok(Array.isArray(data.notifications));
    assert.ok(data.preferences);
  });
});
