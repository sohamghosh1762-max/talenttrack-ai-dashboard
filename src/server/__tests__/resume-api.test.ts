import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { userRepository } from "../db/user-repository.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { tokenRepository } from "../db/token-repository.ts";
import { resumeRepository } from "../repositories/resume.repository.ts";
import { s3Service } from "../services/s3-service.ts";
import { handleApiRequest } from "../routes/index.ts";

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

describe("RESUME UPLOAD & METADATA PERSISTENCE SUITE", () => {
  let applicant1User: any;
  let applicant1Token: string;
  let applicant2User: any;
  let applicant2Token: string;
  let recruiterUser: any;
  let recruiterToken: string;

  beforeEach(() => {
    userRepository.resetToDefaults();
    sessionRepository.clearAll();
    tokenRepository.clearAll();
    resumeRepository.clearAll();
    s3Service.clearMockStorage();

    // 1. Create Applicant 1
    applicant1User = userRepository.createUser({
      email: "applicant1@talenttrack.io",
      name: "Aarav Mehta",
      passwordHash: "passwordHash123",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicant1Token = "applicant1-test-token-abcdef123456";
    sessionRepository.createSession(applicant1User.id, applicant1Token);

    // 2. Create Applicant 2
    applicant2User = userRepository.createUser({
      email: "applicant2@talenttrack.io",
      name: "Priya Sharma",
      passwordHash: "passwordHash123",
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
    });
    applicant2Token = "applicant2-test-token-abcdef123456";
    sessionRepository.createSession(applicant2User.id, applicant2Token);

    // 3. Create Recruiter
    recruiterUser = userRepository.createUser({
      email: "recruiter@talenttrack.io",
      name: "Rahul Verma",
      passwordHash: "passwordHash123",
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
    });
    recruiterToken = "recruiter-test-token-abcdef123456";
    sessionRepository.createSession(recruiterUser.id, recruiterToken);
  });

  it("should successfully upload a valid PDF resume for an authenticated applicant", async () => {
    const validPdfBytes = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xd0, 0xd4, 0xc5, 0xd8, 0x0a,
      0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a,
    ]);

    const req = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: applicant1Token,
      fileName: "Aarav_Mehta_Resume.pdf",
      fileContent: validPdfBytes,
      mimeType: "application/pdf",
    });

    const res = await handleApiRequest(req);
    assert.ok(res, "Response should be defined");
    assert.equal(res.status, 201, "Should return 201 Created");

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.id || json.data._id);
    assert.equal(json.data.originalFileName, "Aarav_Mehta_Resume.pdf");
    assert.equal(json.data.mimeType, "application/pdf");
    assert.equal(json.data.fileSize, validPdfBytes.length);
    assert.ok(json.data.uploadedAt);

    // Verify S3 privacy: response MUST NOT leak credentials or secret keys
    assert.equal(json.data.s3SecretKey, undefined);
    assert.equal(json.data.accessKeyId, undefined);

    // Verify persisted metadata in Resume repository
    const stored = await resumeRepository.findById(json.data.id || json.data._id);
    assert.ok(stored, "Resume metadata should be saved in repository");
    assert.equal(stored.applicantId, applicant1User.id);
    assert.ok(stored.s3Key.startsWith(`resumes/${applicant1User.id}/`));
    assert.equal(stored.originalFileName, "Aarav_Mehta_Resume.pdf");
  });

  it("should successfully upload a valid DOCX resume", async () => {
    // Standard PK zip magic bytes for DOCX: 0x50, 0x4B, 0x03, 0x04
    const validDocxBytes = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00,
    ]);

    const req = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: applicant1Token,
      fileName: "Profile_Document.docx",
      fileContent: validDocxBytes,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 201);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.originalFileName, "Profile_Document.docx");
    assert.equal(
      json.data.mimeType,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });

  it("should reject unauthenticated upload requests with 401", async () => {
    const req = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      // No token
      fileName: "resume.pdf",
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 401);
  });

  it("should reject uploads from non-applicant users with 403 Forbidden", async () => {
    const req = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: recruiterToken, // Recruiter token
      fileName: "candidate_resume.pdf",
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  });

  it("should reject unsupported executable files (.exe)", async () => {
    const exeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // MZ header
    const req = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: applicant1Token,
      fileName: "malicious.exe",
      fileContent: exeBytes,
      mimeType: "application/x-msdownload",
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);

    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error.message, /unsupported|invalid/i);
  });

  it("should reject image files (.png / .jpg) disguised as resumes", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const req = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: applicant1Token,
      fileName: "photo.png",
      fileContent: pngBytes,
      mimeType: "image/png",
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);
  });

  it("should reject files with forged extensions (e.g. .pdf extension but binary is plain text)", async () => {
    const textBytes = new TextEncoder().encode(
      "Hello, this is just plain text masquerading as a pdf.",
    );
    const req = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: applicant1Token,
      fileName: "fake_resume.pdf",
      fileContent: textBytes,
      mimeType: "application/pdf",
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.equal(res.status, 400);

    const json = await res.json();
    assert.equal(json.success, false);
  });

  it("should reject oversized files exceeding 10MB limit", async () => {
    // 11 MB buffer
    const oversizedBytes = new Uint8Array(11 * 1024 * 1024);
    oversizedBytes.set([0x25, 0x50, 0x44, 0x46, 0x2d]); // PDF header

    const req = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: applicant1Token,
      fileName: "giant_resume.pdf",
      fileContent: oversizedBytes,
      mimeType: "application/pdf",
    });

    const res = await handleApiRequest(req);
    assert.ok(res);
    assert.ok([400, 413].includes(res.status));
  });

  it("should retrieve resume metadata by ID for the authorized owner", async () => {
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const uploadReq = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: applicant1Token,
      fileName: "My_Resume.pdf",
      fileContent: validPdfBytes,
    });
    const uploadRes = await handleApiRequest(uploadReq);
    assert.ok(uploadRes);
    const { data: uploaded } = await uploadRes.json();
    const resumeId = uploaded.id || uploaded._id;

    // Applicant 1 fetches their resume
    const getReq = createJsonRequest(`https://talenttrack.ai/api/resumes/${resumeId}`, {
      token: applicant1Token,
    });
    const getRes = await handleApiRequest(getReq);
    assert.ok(getRes);
    assert.equal(getRes.status, 200);

    const json = await getRes.json();
    assert.equal(json.success, true);
    assert.equal(json.data.originalFileName, "My_Resume.pdf");
  });

  it("should deny access when an applicant attempts to view another applicant's resume", async () => {
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const uploadReq = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: applicant1Token,
      fileName: "Applicant1_Confidential.pdf",
      fileContent: validPdfBytes,
    });
    const uploadRes = await handleApiRequest(uploadReq);
    assert.ok(uploadRes);
    const { data: uploaded } = await uploadRes.json();
    const resumeId = uploaded.id || uploaded._id;

    // Applicant 2 attempts to fetch Applicant 1's resume
    const snoopingReq = createJsonRequest(`https://talenttrack.ai/api/resumes/${resumeId}`, {
      token: applicant2Token,
    });
    const snoopingRes = await handleApiRequest(snoopingReq);
    assert.ok(snoopingRes);
    assert.equal(snoopingRes.status, 403, "Should return 403 Forbidden for unauthorized applicant");
  });

  it("should generate a secure presigned download URL for authorized users", async () => {
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const uploadReq = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: applicant1Token,
      fileName: "Downloadable_Resume.pdf",
      fileContent: validPdfBytes,
    });
    const uploadRes = await handleApiRequest(uploadReq);
    assert.ok(uploadRes);
    const { data: uploaded } = await uploadRes.json();
    const resumeId = uploaded.id || uploaded._id;

    // Request download URL
    const downloadReq = createJsonRequest(
      `https://talenttrack.ai/api/resumes/${resumeId}/download`,
      {
        token: applicant1Token,
      },
    );
    const downloadRes = await handleApiRequest(downloadReq);
    assert.ok(downloadRes);
    assert.equal(downloadRes.status, 200);

    const json = await downloadRes.json();
    assert.equal(json.success, true);
    assert.ok(json.data.downloadUrl, "Download URL must be present");
    assert.ok(json.data.expiresIn > 0, "Presigned expiry must be positive integer");
    assert.equal(json.data.fileName, "Downloadable_Resume.pdf");
  });

  it("should successfully delete a resume and purge metadata", async () => {
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const uploadReq = createMultipartResumeRequest("https://talenttrack.ai/api/resumes", {
      token: applicant1Token,
      fileName: "To_Delete.pdf",
      fileContent: validPdfBytes,
    });
    const uploadRes = await handleApiRequest(uploadReq);
    assert.ok(uploadRes);
    const { data: uploaded } = await uploadRes.json();
    const resumeId = uploaded.id || uploaded._id;

    // Delete resume
    const deleteReq = createJsonRequest(`https://talenttrack.ai/api/resumes/${resumeId}`, {
      method: "DELETE",
      token: applicant1Token,
    });
    const deleteRes = await handleApiRequest(deleteReq);
    assert.ok(deleteRes);
    assert.equal(deleteRes.status, 200);

    // Verify it is gone
    const fetchAfterDelete = await resumeRepository.findById(resumeId);
    assert.equal(fetchAfterDelete, null);
  });
});
