import { z } from "zod";

export const dayClosureFormSchema = z.object({
  businessDate: z.string().min(1, "Business date is required"),
  physicalCounts: z.object({
    cash: z.coerce.number().min(0, "Cash count cannot be negative"),
    card: z.coerce.number().min(0, "Card slip count cannot be negative"),
    upi: z.coerce.number().min(0, "UPI settlement count cannot be negative"),
    other: z.coerce.number().min(0, "Other tender count cannot be negative").default(0),
  }),
  discrepancyReason: z.string().trim().optional(),
});

export const dayClosureApprovalSchema = z.object({
  managerNotes: z.string().trim().optional(),
});

export type DayClosureFormValues = z.infer<typeof dayClosureFormSchema>;
export type DayClosureApprovalValues = z.infer<typeof dayClosureApprovalSchema>;
