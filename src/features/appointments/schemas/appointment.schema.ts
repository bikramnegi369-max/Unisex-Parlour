import { z } from "zod";

export const createAppointmentSchema = z.object({
  branchId: z.string().min(1, "Branch is required for appointment creation"),
  customerId: z.string().min(1, "Customer selection is required"),
  serviceIds: z
    .array(z.string())
    .min(1, "At least one service must be selected"),
  staffId: z.string().nullable().optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z
    .string()
    .min(1, "Start time is required")
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time format must be HH:mm (e.g. 10:30)"),
  bookingType: z.enum(["advance", "walk_in"]),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  reminder: z
    .object({
      enabled: z.boolean(),
      channel: z.enum(["email", "sms", "both"]),
      offsetMinutes: z.number().int("Offset must be an integer").min(1, "Offset must be positive"),
    })
    .optional(),
});

export type CreateAppointmentSchemaType = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  date: z.string().min(1, "New date is required"),
  startTime: z
    .string()
    .min(1, "New start time is required")
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time format must be HH:mm (e.g. 10:30)"),
  reason: z.string().max(300, "Reason cannot exceed 300 characters").optional(),
});

export type RescheduleAppointmentSchemaType = z.infer<typeof rescheduleAppointmentSchema>;

export const assignStaffSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  staffId: z.string().nullable(),
});

export type AssignStaffSchemaType = z.infer<typeof assignStaffSchema>;

export const updateStatusSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "no_show"]),
  cancellationReason: z
    .string()
    .max(300, "Reason cannot exceed 300 characters")
    .optional(),
});

export type UpdateStatusSchemaType = z.infer<typeof updateStatusSchema>;
