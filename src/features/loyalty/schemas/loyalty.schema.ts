import { z } from "zod";

export const loyaltyProgramConfigSchema = z.object({
  isEnabled: z.boolean(),
  earnThresholdAmount: z.coerce
    .number()
    .min(1, "Earning threshold must be at least ₹1")
    .default(100),
  earnPointsPerUnit: z.coerce
    .number()
    .min(0, "Earn points cannot be negative")
    .default(1),
  redemptionRate: z.coerce
    .number()
    .positive("Redemption rate must be greater than zero")
    .default(1),
  minRedemptionPoints: z.coerce
    .number()
    .int("Minimum points must be an integer")
    .min(1, "Minimum redemption points must be at least 1")
    .default(20),
  maxRedemptionPercentage: z.coerce
    .number()
    .min(1, "Maximum percentage must be at least 1%")
    .max(100, "Maximum percentage cannot exceed 100%")
    .default(20),
});

export type LoyaltyProgramConfigFormValues = z.infer<typeof loyaltyProgramConfigSchema>;

export const manualPointsAdjustSchema = z.object({
  operation: z.enum(["CREDIT", "DEBIT"], {
    message: "Operation must be CREDIT or DEBIT",
  }),
  points: z.coerce
    .number()
    .int("Points must be an integer")
    .positive("Points must be greater than zero"),
  reason: z
    .string()
    .min(3, "Reason must be at least 3 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

export type ManualPointsAdjustFormValues = z.infer<typeof manualPointsAdjustSchema>;

