import { z } from "zod";

export const entitlementItemSchema = z.object({
  serviceId: z.string().min(1, "Please select a service"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be a positive integer"),
});

export const createSubscriptionSchema = z
  .object({
    customerId: z.string().min(1, "Customer is required"),
    planId: z.string().trim().optional(),
    price: z.coerce
      .number()
      .min(0, "Price must be greater than or equal to 0"),
    entitlements: z
      .array(entitlementItemSchema)
      .min(1, "At least one service entitlement is required"),
    permittedBranchIds: z.array(z.string()).default([]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    notes: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
      return end >= start;
    },
    {
      message: "End date must not precede start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      const serviceIds = data.entitlements.map((e) => e.serviceId);
      const unique = new Set(serviceIds);
      return unique.size === serviceIds.length;
    },
    {
      message: "Duplicate services are not allowed in entitlements",
      path: ["entitlements"],
    }
  );

export type CreateSubscriptionFormValues = z.infer<typeof createSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  permittedBranchIds: z.array(z.string()).default([]),
  endDate: z.string().optional(),
  notes: z.string().trim().optional(),
});

export type UpdateSubscriptionFormValues = z.infer<typeof updateSubscriptionSchema>;

export const cancelSubscriptionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Cancellation reason is required")
    .max(500, "Reason must be less than 500 characters"),
});

export type CancelSubscriptionFormValues = z.infer<typeof cancelSubscriptionSchema>;

export const redeemServiceItemSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1"),
});

export const redeemSubscriptionSchema = z
  .object({
    isManual: z.boolean().default(false),
    reason: z
      .string()
      .trim()
      .max(1000, "Reason must not exceed 1000 characters")
      .optional(),
    idempotencyKey: z.string().trim().max(255).optional(),
    otp: z
      .string()
      .trim()
      .max(10, "OTP must not exceed 10 digits")
      .optional(),
    services: z
      .array(redeemServiceItemSchema)
      .min(1, "Please select at least one service to redeem"),
    appointmentId: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.isManual) {
        return !!data.reason && data.reason.trim().length > 0;
      }
      return true;
    },
    {
      message: "Reason is required for manual redemption",
      path: ["reason"],
    }
  )
  .refine(
    (data) => {
      if (!data.isManual) {
        return !!data.otp && data.otp.trim().length >= 4;
      }
      return true;
    },
    {
      message: "Customer OTP must be at least 4 digits",
      path: ["otp"],
    }
  );

export type RedeemSubscriptionFormValues = z.infer<typeof redeemSubscriptionSchema>;
