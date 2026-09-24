import { z } from "zod";

export const planEntitlementSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const createSubscriptionPlanSchema = z.object({
  name: z.string().trim().min(2, "Plan name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional(),
  suggestedPrice: z.coerce.number().min(0, "Suggested price cannot be negative"),
  validityMonths: z.coerce.number().int().min(1, "Validity must be at least 1 month").max(120),
  entitlements: z
    .array(planEntitlementSchema)
    .min(1, "At least one service entitlement is required"),
  isActive: z.boolean().default(true),
});

export const updateSubscriptionPlanSchema = createSubscriptionPlanSchema.partial();

export type CreateSubscriptionPlanFormValues = z.infer<typeof createSubscriptionPlanSchema>;
export type UpdateSubscriptionPlanFormValues = z.infer<typeof updateSubscriptionPlanSchema>;
