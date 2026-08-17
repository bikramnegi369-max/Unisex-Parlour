import { describe, it, expect } from "vitest";
import { verifyOtpSchema, activatePasswordSchema } from "../auth.schema";

describe("Auth Zod Schemas", () => {
  describe("verifyOtpSchema", () => {
    it("validates correct 6-digit numeric OTP and activationToken", () => {
      const result = verifyOtpSchema.safeParse({
        otp: "123456",
        activationToken: "act-token-123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-numeric characters in OTP", () => {
      const result = verifyOtpSchema.safeParse({
        otp: "12345A",
        activationToken: "act-token-123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Verification code must contain only numbers");
      }
    });

    it("rejects OTP not equal to 6 digits", () => {
      const result = verifyOtpSchema.safeParse({
        otp: "12345",
        activationToken: "act-token-123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Verification code must be exactly 6 digits");
      }
    });

    it("rejects empty activationToken", () => {
      const result = verifyOtpSchema.safeParse({
        otp: "123456",
        activationToken: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("activatePasswordSchema", () => {
    it("validates strong matching passwords", () => {
      const result = activatePasswordSchema.safeParse({
        password: "Password123!",
        confirmPassword: "Password123!",
      });
      expect(result.success).toBe(true);
    });

    it("rejects passwords shorter than 8 characters", () => {
      const result = activatePasswordSchema.safeParse({
        password: "Pass1!",
        confirmPassword: "Pass1!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Password must be at least 8 characters");
      }
    });

    it("rejects passwords lacking uppercase letter", () => {
      const result = activatePasswordSchema.safeParse({
        password: "password123!",
        confirmPassword: "password123!",
      });
      expect(result.success).toBe(false);
    });

    it("rejects passwords lacking lowercase letter", () => {
      const result = activatePasswordSchema.safeParse({
        password: "PASSWORD123!",
        confirmPassword: "PASSWORD123!",
      });
      expect(result.success).toBe(false);
    });

    it("rejects passwords lacking number", () => {
      const result = activatePasswordSchema.safeParse({
        password: "PasswordCode!",
        confirmPassword: "PasswordCode!",
      });
      expect(result.success).toBe(false);
    });

    it("rejects passwords lacking special character", () => {
      const result = activatePasswordSchema.safeParse({
        password: "Password1234",
        confirmPassword: "Password1234",
      });
      expect(result.success).toBe(false);
    });

    it("rejects mismatching confirmPassword", () => {
      const result = activatePasswordSchema.safeParse({
        password: "Password123!",
        confirmPassword: "DifferentPassword123!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Passwords do not match");
      }
    });
  });
});
