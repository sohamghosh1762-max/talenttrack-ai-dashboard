import { createRequire } from "node:module";
import mammoth from "mammoth";
import { BadRequestError } from "../utils/errors.ts";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export const MAX_RESUME_TEXT_CHARS = 50_000;

export interface ExtractedResumeText {
  rawText: string;
  normalizedText: string;
  charCount: number;
  isTruncated: boolean;
}

export class ResumeTextExtractor {
  /**
   * Normalizes raw extracted text:
   * - Normalizes newlines (\r\n -> \n)
   * - Collapses excessive horizontal spaces while keeping line structure
   * - Collapses 3+ newlines to max 2 newlines (preserving sections/paragraphs)
   * - Preserves bullet markers, dates, technical terms, and headings
   * - Enforces server-side max character limit (50,000 chars)
   */
  public normalizeText(rawText: string): ExtractedResumeText {
    if (!rawText || typeof rawText !== "string") {
      throw new BadRequestError("Unable to extract readable text from this resume.");
    }

    // 1. Normalize line endings
    let clean = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 2. Normalize excessive horizontal whitespace (tabs, repeated spaces) per line
    clean = clean
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n");

    // 3. Limit consecutive blank lines to max 2
    clean = clean.replace(/\n{3,}/g, "\n\n").trim();

    // 4. Validate non-empty content
    const nonWhitespaceCount = clean.replace(/\s+/g, "").length;
    if (nonWhitespaceCount < 10) {
      throw new BadRequestError("Unable to extract readable text from this resume.");
    }

    // 5. Enforce safe size limit
    const isTruncated = clean.length > MAX_RESUME_TEXT_CHARS;
    if (isTruncated) {
      clean =
        clean.substring(0, MAX_RESUME_TEXT_CHARS) +
        "\n\n... [Resume text truncated for processing]";
    }

    return {
      rawText,
      normalizedText: clean,
      charCount: clean.length,
      isTruncated,
    };
  }

  /**
   * Extract text from PDF buffer
   */
  public async extractFromPdf(buffer: Buffer): Promise<string> {
    try {
      let text = "";
      if (typeof pdfParse === "function") {
        const data = await pdfParse(buffer);
        text = (data && data.text) || "";
      } else if (pdfParse && typeof pdfParse.PDFParse === "function") {
        const parser = new pdfParse.PDFParse({ data: buffer });
        const data = await parser.getText();
        text = (data && data.text) || "";
        if (typeof parser.destroy === "function") {
          try {
            await parser.destroy();
          } catch {
            // Non-fatal cleanup failure
          }
        }
      }
      if (!text.trim()) {
        throw new BadRequestError("Unable to extract readable text from this resume.");
      }
      return text;
    } catch (err: unknown) {
      if (err instanceof BadRequestError) throw err;
      // Fallback: If buffer is plain UTF-8 text string (e.g. testing / dev mocks)
      const asUtf8 = buffer.toString("utf-8");
      if (asUtf8.length >= 10 && !asUtf8.startsWith("%PDF")) {
        return asUtf8;
      }
      throw new BadRequestError("Unable to extract readable text from this resume.");
    }
  }

  /**
   * Extract text from DOCX buffer
   */
  public async extractFromDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result && result.value) || "";
      if (!text.trim()) {
        throw new BadRequestError("Unable to extract readable text from this resume.");
      }
      return text;
    } catch (err: unknown) {
      if (err instanceof BadRequestError) throw err;
      // Fallback: If buffer is plain UTF-8 text string
      const asUtf8 = buffer.toString("utf-8");
      if (asUtf8.length >= 10 && !asUtf8.startsWith("PK")) {
        return asUtf8;
      }
      throw new BadRequestError("Unable to extract readable text from this resume.");
    }
  }

  /**
   * Universal text extractor dispatcher based on mimeType and/or file signatures
   */
  public async extractText(buffer: Buffer, mimeType: string): Promise<ExtractedResumeText> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestError("Unable to extract readable text from this resume.");
    }

    const isPdf =
      mimeType === "application/pdf" ||
      (buffer.length >= 4 && buffer.slice(0, 4).toString() === "%PDF");

    const isDocx =
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b); // PK zip header for docx

    let rawText = "";

    if (isPdf) {
      rawText = await this.extractFromPdf(buffer);
    } else if (isDocx) {
      rawText = await this.extractFromDocx(buffer);
    } else {
      // Fallback attempt: if UTF-8 plain text string
      try {
        const asUtf8 = buffer.toString("utf-8");
        if (asUtf8.length >= 10 && !/[^\x20-\x7E\t\r\n]/.test(asUtf8.substring(0, 100))) {
          rawText = asUtf8;
        } else {
          throw new BadRequestError("Unable to extract readable text from this resume.");
        }
      } catch {
        throw new BadRequestError("Unable to extract readable text from this resume.");
      }
    }

    return this.normalizeText(rawText);
  }
}

export const resumeTextExtractor = new ResumeTextExtractor();
