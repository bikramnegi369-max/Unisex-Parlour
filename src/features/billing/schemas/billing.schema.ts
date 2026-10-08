import { z } from "zod";

export const createInvoiceSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  appointmentId: z.string().min(1, "Appointment ID is required"),
  discountTotal: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .default(0),
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional(),
});

export type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export const updateDraftInvoiceSchema = z.object({
  discountTotal: z.coerce
    .number()
    .min(0, "Discount cannot be negative"),
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
