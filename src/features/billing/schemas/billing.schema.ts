import { z } from "zod";

export const productLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const serviceLineSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const subscriptionLineSchema = z.object({
  planId: z.string().min(1, "Subscription plan is required"),
});

export const membershipLineSchema = z.object({
  membershipPlanId: z.string().min(1, "Membership plan is required"),
  quantity: z.coerce.number().int().min(1).optional().default(1),
});

export const createInvoiceSchema = z
  .object({
    branchId: z.string().min(1, "Branch is required"),
    appointmentId: z.string().optional(),
    customerId: z.string().optional(),
    serviceLines: z.array(serviceLineSchema).optional(),
    productLines: z.array(productLineSchema).optional(),
    subscriptionLines: z.array(subscriptionLineSchema).optional(),
    membershipLines: z.array(membershipLineSchema).optional(),
    membershipPlanId: z.string().optional(),
    discountTotal: z.coerce
      .number()
      .min(0, "Discount cannot be negative")
      .optional(),
    redeemLoyaltyPoints: z.coerce
      .number()
      .int("Loyalty points must be an integer")
      .min(0, "Loyalty points cannot be negative")
      .optional(),
    notes: z
      .string()
      .max(500, "Notes cannot exceed 500 characters")
      .optional(),
  })
  .refine(
    (data) => Boolean(data.appointmentId || data.customerId),
    {
      message: "Customer or appointment is required to generate an invoice",
      path: ["customerId"],
    }
  );

export type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export const updateDraftInvoiceSchema = z.object({
  serviceLines: z.array(serviceLineSchema).optional(),
  productLines: z.array(productLineSchema).optional(),
  subscriptionLines: z.array(subscriptionLineSchema).optional(),
  membershipLines: z.array(membershipLineSchema).optional(),
  membershipPlanId: z.string().optional(),
  discountTotal: z.coerce
    .number()
    .min(0, "Discount cannot be negative"),
  redeemLoyaltyPoints: z.coerce
    .number()
    .int("Loyalty points must be an integer")
    .min(0, "Loyalty points cannot be negative")
    .optional(),
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional(),
});

export type UpdateDraftInvoiceFormValues = z.infer<typeof updateDraftInvoiceSchema>;


export const recordPaymentSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["cash", "card", "upi", "other"], {
    message: "Valid payment method is required",
  }),
  referenceNote: z
    .string()
    .max(250, "Reference note cannot exceed 250 characters")
    .optional(),
});

export type RecordPaymentFormValues = z.infer<typeof recordPaymentSchema>;

export const cancelInvoiceSchema = z.object({
  reason: z
    .string()
    .max(300, "Reason cannot exceed 300 characters")
    .optional(),
});

export type CancelInvoiceFormValues = z.infer<typeof cancelInvoiceSchema>;

export const voidPaymentSchema = z.object({
  reason: z
    .string()
    .min(1, "Void reason is required")
    .max(300, "Void reason cannot exceed 300 characters"),
});

export type VoidPaymentFormValues = z.infer<typeof voidPaymentSchema>;
