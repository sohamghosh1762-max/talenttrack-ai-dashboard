import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional().default(true),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Full name is required.").max(100, "Name is too long."),
    email: z.string().trim().email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(128, "Password cannot exceed 128 characters."),
    confirmPassword: z.string().optional(),
    role: z
      .enum([
        "recruiter",
        "applicant",
        "admin",
        "RECRUITER",
        "APPLICANT",
        "SUPER_ADMIN",
        "ADMIN",
        "ORG_ADMIN",
        "HIRING_MANAGER",
        "INTERVIEWER",
      ])
      .default("recruiter"),
    companyName: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    headline: z.string().optional(),
    location: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword && data.confirmPassword !== data.password) {
        return false;
      }
      return true;
    },
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    },
  );

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required."),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(128, "Password cannot exceed 128 characters."),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword && data.confirmPassword !== data.password) {
        return false;
      }
      return true;
    },
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    },
  );

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required."),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
