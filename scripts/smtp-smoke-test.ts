#!/usr/bin/env node
/**
 * TalentTrack AI — Optional Live SMTP Delivery Smoke Test
 *
 * This script performs an end-to-end SMTP transmission test against a real SMTP server.
 * It is opt-in and will NOT run unless explicitly enabled via environment variables.
 *
 * Usage:
 *   RUN_LIVE_SMTP_TEST=true TEST_EMAIL_RECIPIENT=your-test-inbox@example.com node --experimental-strip-types scripts/smtp-smoke-test.ts
 */

import { SmtpEmailProvider } from "../src/server/services/email/provider.ts";
import { config } from "../src/server/config/index.ts";

async function runLiveSmtpSmokeTest(): Promise<void> {
  const isEnabled = process.env["RUN_LIVE_SMTP_TEST"] === "true" || process.argv.includes("--live");
  const testRecipient = process.env["TEST_EMAIL_RECIPIENT"];

  if (!isEnabled) {
    console.log("[SMTP Smoke Test] SKIPPED: Opt-in smoke test is disabled.");
    console.log(
      "To run live test, execute with: RUN_LIVE_SMTP_TEST=true TEST_EMAIL_RECIPIENT=user@example.com node --experimental-strip-types scripts/smtp-smoke-test.ts",
    );
    process.exit(0);
  }

  if (!testRecipient || !testRecipient.includes("@")) {
    console.error(
      "[SMTP Smoke Test] ERROR: TEST_EMAIL_RECIPIENT environment variable must be set to an authorized test email address.",
    );
    process.exit(1);
  }

  const host = config.email.host || process.env["SMTP_HOST"];
  if (!host) {
    console.error(
      "[SMTP Smoke Test] ERROR: SMTP_HOST must be configured in environment or .env file.",
    );
    process.exit(1);
  }

  console.log(`[SMTP Smoke Test] Target SMTP Server: ${host}:${config.email.port || 587}`);
  console.log(`[SMTP Smoke Test] Sender: ${config.email.fromName} <${config.email.fromEmail}>`);
  console.log(`[SMTP Smoke Test] Recipient: ${testRecipient}`);

  const provider = new SmtpEmailProvider();

  // Step 1: Probe SMTP transport connectivity
  console.log("[SMTP Smoke Test] 1. Probing SMTP connection and credentials...");
  const isConnected = await provider.verify();
  if (!isConnected) {
    console.error(
      "[SMTP Smoke Test] FAIL: Unable to verify SMTP connection. Check credentials, host, and port.",
    );
    provider.close();
    process.exit(1);
  }
  console.log(
    "[SMTP Smoke Test] PASS: SMTP connection handshake and credentials verified successfully.",
  );

  // Step 2: Transmit live test email
  const timestamp = new Date().toISOString();
  console.log("[SMTP Smoke Test] 2. Transmitting live test message...");
  const result = await provider.send({
    to: testRecipient,
    subject: `TalentTrack AI — Live SMTP Smoke Test (${timestamp})`,
    text: `This is an automated smoke test message from TalentTrack AI dispatched at ${timestamp}.\n\nIf you received this message, SMTP delivery is functioning correctly.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">TalentTrack AI — Live SMTP Delivery Verified</h2>
        <p>This automated message was dispatched at <strong>${timestamp}</strong> to verify production email connectivity.</p>
        <p style="color: #16a34a; font-weight: bold;">✓ SMTP Handshake & Submission Successful</p>
      </div>
    `,
  });

  provider.close();

  if (!result.success) {
    console.error(`[SMTP Smoke Test] FAIL: SMTP server rejected transmission: ${result.error}`);
    process.exit(1);
  }

  console.log(`[SMTP Smoke Test] SUCCESS: Email accepted by SMTP server.`);
  console.log(`[SMTP Smoke Test] Message ID: ${result.messageId}`);
  console.log(
    "[SMTP Smoke Test] NOTE: Successful submission confirms the provider accepted the message. Check your inbox to confirm final delivery.",
  );
}

runLiveSmtpSmokeTest().catch((err: unknown) => {
  console.error("[SMTP Smoke Test] Unexpected error:", err);
  process.exit(1);
});
