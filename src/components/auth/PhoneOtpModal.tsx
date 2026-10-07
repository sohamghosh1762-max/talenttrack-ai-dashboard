"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, KeyRound, AlertCircle, ArrowRight, RotateCw, CheckCircle2 } from "lucide-react";
import { firebaseAuthService } from "@/auth/firebase-auth-service";
import type { ConfirmationResult } from "firebase/auth";
import type { RecaptchaVerifier } from "firebase/auth";

interface PhoneOtpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: any, token: string) => void;
}

export function PhoneOtpModal({ open, onOpenChange, onSuccess }: PhoneOtpModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setStep("phone");
      setOtpCode("");
      setErrorMessage("");
      setSuccessMessage("");
      confirmationResultRef.current = null;
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore cleanup
        }
        recaptchaVerifierRef.current = null;
      }
    }
  }, [open]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const cleaned = phoneNumber.trim();
    if (!cleaned) {
      setErrorMessage("Please enter a valid phone number.");
      return;
    }

    // Format phone with country code if missing
    const formattedPhone = cleaned.startsWith("+") ? cleaned : `+91${cleaned.replace(/^0+/, "")}`;

    setIsLoading(true);
    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = firebaseAuthService.setupRecaptcha("recaptcha-container");
      }

      const confirmation = await firebaseAuthService.sendPhoneOtp(
        formattedPhone,
        recaptchaVerifierRef.current,
      );
      confirmationResultRef.current = confirmation;
      setStep("otp");
      setCountdown(45);
      setSuccessMessage(`Verification code sent to ${formattedPhone}`);
    } catch (err: any) {
      setErrorMessage(firebaseAuthService.mapErrorMessage(err));
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    if (!confirmationResultRef.current) {
      setErrorMessage("Session expired. Please request a new verification code.");
      setStep("phone");
      return;
    }

    setIsLoading(true);
    try {
      const { token } = await firebaseAuthService.verifyPhoneOtp(
        confirmationResultRef.current,
        otpCode.trim(),
      );

      // Bootstrap backend session
      const backendUser = await firebaseAuthService.bootstrapBackend(token);
      setSuccessMessage("Phone verified successfully!");
      onSuccess(backendUser, token);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMessage(firebaseAuthService.mapErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Phone className="size-5 text-brand-blue" />
            {step === "phone" ? "Sign in with Phone" : "Enter Verification Code"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === "phone"
              ? "We'll send a 6-digit SMS verification code to your phone number."
              : `Enter the code sent to ${phoneNumber}.`}
          </DialogDescription>
        </DialogHeader>

        {/* Hidden reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && !errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-brand-green/20 bg-surface-green p-3 text-xs text-brand-green animate-in fade-in-50">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4 pt-2">
            <div>
              <label htmlFor="phone-input" className="block text-xs font-semibold text-foreground mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="phone-input"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-10 w-full rounded-lg border border-input bg-card pl-9.5 pr-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Include country code (e.g., +91 for India, +1 for US/Canada).
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !phoneNumber.trim()}
              className="w-full h-10 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs transition-transform active:scale-[0.99] gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RotateCw className="size-3.5 animate-spin" />
                  Sending verification code...
                </>
              ) : (
                <>
                  Send Verification Code
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
            <div>
              <label htmlFor="otp-input" className="block text-xs font-semibold text-foreground mb-1">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="otp-input"
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="h-10 w-full rounded-lg border border-input bg-card pl-9.5 pr-3 text-center text-base tracking-widest font-mono outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || otpCode.length < 6}
              className="w-full h-10 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs transition-transform active:scale-[0.99] gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RotateCw className="size-3.5 animate-spin" />
                  Verifying code...
                </>
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setErrorMessage("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Change Phone Number
              </button>

              <button
                type="button"
                disabled={countdown > 0 || isLoading}
                onClick={() => handleSendOtp()}
                className={`text-xs font-semibold ${
                  countdown > 0
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-brand-blue hover:underline cursor-pointer"
                }`}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
