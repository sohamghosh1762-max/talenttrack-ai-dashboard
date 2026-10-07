export function getVerificationEmailTemplate(options: {
  userName: string;
  verificationUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = "Verify your email address — TalentTrack AI";
  const text = `Hello ${options.userName},\n\nWelcome to TalentTrack AI. Please verify your email address by visiting the following link:\n${options.verificationUrl}\n\nThis verification link will expire in 48 hours.\n\nBest regards,\nTalentTrack AI Team`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="color: #0f172a; margin-bottom: 16px;">Verify your email address</h2>
      <p>Hello <strong>${options.userName}</strong>,</p>
      <p>Welcome to <strong>TalentTrack AI</strong>. Please click the button below to verify your email address and activate your account:</p>
      <div style="margin: 28px 0;">
        <a href="${options.verificationUrl}" style="background-color: #1264F5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">This verification link will expire in 48 hours. If you did not sign up for TalentTrack AI, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px;">TalentTrack AI • Smarter Hiring. Brighter Teams.</p>
    </div>
  `;

  return { subject, html, text };
}

export function getPasswordResetEmailTemplate(options: { userName: string; resetUrl: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Reset your password — TalentTrack AI";
  const text = `Hello ${options.userName},\n\nWe received a request to reset your TalentTrack AI password. Please visit the link below to set a new password:\n${options.resetUrl}\n\nThis password reset link will expire in 60 minutes.\n\nIf you did not request a password reset, please ignore this message.\n\nBest regards,\nTalentTrack AI Team`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="color: #0f172a; margin-bottom: 16px;">Reset your password</h2>
      <p>Hello <strong>${options.userName}</strong>,</p>
      <p>We received a request to reset your password for your <strong>TalentTrack AI</strong> account. Click the button below to set a new password:</p>
      <div style="margin: 28px 0;">
        <a href="${options.resetUrl}" style="background-color: #1264F5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">This link will expire in 60 minutes. If you did not request a password reset, you can safely ignore this email; your account remains secure.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px;">TalentTrack AI • Smarter Hiring. Brighter Teams.</p>
    </div>
  `;

  return { subject, html, text };
}
