import multer from "multer";
import { ValidationError } from "../utils/errors.ts";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

export const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".doc"]);

export const DISALLOWED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".sh",
  ".bin",
  ".cmd",
  ".msi",
  ".js",
  ".ts",
  ".html",
  ".php",
  ".py",
  ".zip",
  ".rar",
  ".tar",
  ".gz",
  ".7z",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".mp3",
  ".mp4",
]);

/**
 * Validates file extension against allowed whitelist and prohibited blacklist
 */
export function validateFileExtension(fileName: string): { valid: boolean; extension: string } {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return { valid: false, extension: "" };
  }

  const extension = fileName.substring(dotIndex).toLowerCase();

  if (DISALLOWED_EXTENSIONS.has(extension)) {
    return { valid: false, extension };
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return { valid: false, extension };
  }

  return { valid: true, extension };
}

/**
 * Inspects binary magic bytes / signature to prevent extension-spoofing attacks
 */
export function validateMagicBytes(buffer: Buffer, extension: string): boolean {
  if (buffer.length < 4) return false;

  // PDF Magic Bytes: %PDF- (0x25 0x50 0x44 0x46)
  if (extension === ".pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  // DOCX / OpenXML is a ZIP archive container: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (extension === ".docx") {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  // DOC (legacy binary format) starts with 0xD0 0xCF 0x11 0xE0 (Composite Document File)
  if (extension === ".doc") {
    return (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    );
  }

  return false;
}

/**
 * Validates a resume file buffer, name, and mime type
 */
export function validateResumeFile(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): void {
  if (!fileName || typeof fileName !== "string") {
    throw new ValidationError("Invalid file: Filename is required.");
  }

  if (!buffer || buffer.length === 0) {
    throw new ValidationError("Uploaded file is empty.");
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    throw new ValidationError(
      `File size (${sizeMb} MB) exceeds maximum allowed limit of 10 MB.`,
      { size: buffer.length, limit: MAX_FILE_SIZE_BYTES },
    );
  }

  const { valid, extension } = validateFileExtension(fileName);
  if (!valid) {
    throw new ValidationError(
      `Unsupported file type (${extension || "unknown"}). Only PDF and DOCX documents are supported.`,
    );
  }

  const normalizedMime = mimeType ? mimeType.toLowerCase().trim() : "";
  if (!ALLOWED_MIME_TYPES.has(normalizedMime) && !normalizedMime.includes("pdf") && !normalizedMime.includes("word")) {
    throw new ValidationError(
      `Unsupported MIME type (${normalizedMime}). Please upload a valid PDF or DOCX file.`,
    );
  }

  const matchesSignature = validateMagicBytes(buffer, extension);
  if (!matchesSignature) {
    throw new ValidationError(
      `Corrupted or invalid file format. The file content does not match standard ${extension.toUpperCase().slice(1)} structure.`,
    );
  }
}

/**
 * Multer Memory Storage Configuration for Express endpoints
 */
export const resumeUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const { valid } = validateFileExtension(file.originalname);
    if (!valid || !ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      return cb(
        new ValidationError(
          `Invalid file format: ${file.originalname}. Only PDF and DOCX files are allowed.`,
        ),
      );
    }
    cb(null, true);
  },
});

/**
 * Universal Web Fetch API parser for multipart/form-data requests
 */
export async function parseResumeFormData(
  req: Request,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string; fileSize: number }> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data") && !contentType.includes("form-data")) {
    throw new ValidationError("Invalid Content-Type. Expected multipart/form-data.");
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err: any) {
    throw new ValidationError(`Failed to parse multipart form data: ${err.message || "Invalid payload"}`);
  }

  // Check 'resume', 'file', or fallback to first file entry in FormData
  let fileEntry = formData.get("resume") || formData.get("file");

  if (!fileEntry || typeof fileEntry === "string") {
    // Search for any File entry
    for (const [_key, val] of formData.entries()) {
      if (val && typeof val === "object" && "arrayBuffer" in val) {
        fileEntry = val;
        break;
      }
    }
  }

  if (!fileEntry || typeof fileEntry === "string" || !("arrayBuffer" in fileEntry)) {
    throw new ValidationError("No resume file found in upload payload. Field 'resume' is required.");
  }

  const file = fileEntry as File;
  const fileName = file.name || "resume.pdf";
  const mimeType = file.type || "application/pdf";
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  validateResumeFile(fileName, mimeType, buffer);

  return {
    buffer,
    fileName,
    mimeType,
    fileSize: buffer.length,
  };
}
