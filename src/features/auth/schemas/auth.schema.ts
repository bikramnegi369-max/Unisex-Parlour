import { z } from "zod";

/**
 * Schema for OTP verification payload / form validation.
 * Enforces 6 numeric digits and non-empty activationToken.
 */
export const verifyOtpSchema = z.object({
  otp: z
    .string()
    .length(6, "Verification code must be exactly 6 digits")
    .regex(/^\d+$/, "Verification code must contain only numbers"),
  activationToken: z.string().min(1, "Activation token is required"),
});

export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

/**
 * Schema for password creation and confirmation during activation / password change.
 * Enforces length >= 8, uppercase, lowercase, digit, special character, and match.
 */
export const activatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^a-zA-Z0-9]/,
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ActivatePasswordFormValues = z.infer<typeof activatePasswordSchema>;

// Export aliases for compatibility
export const passwordSchema = activatePasswordSchema;
export type PasswordFormValues = ActivatePasswordFormValues;
