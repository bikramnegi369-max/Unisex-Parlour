import { z } from "zod";

export const registeredServiceItemSchema = z.object({
  serviceType: z.literal("registered").default("registered"),
  serviceId: z.string().min(1, "Service ID is required"),
  customPrice: z.coerce.number().min(0, "Price must be a positive number").optional(),
  appliedSubscriptionId: z.string().nullable().optional(),
});

export const customServiceItemSchema = z.object({
  serviceType: z.literal("custom"),
  name: z
    .string()
    .trim()
    .min(1, "Service name is required")
    .max(120, "Service name cannot exceed 120 characters"),
  duration: z.coerce
    .number()
    .int("Duration must be an integer")
    .min(1, "Duration must be at least 1 minute")
    .max(720, "Duration cannot exceed 720 minutes (12 hours)"),
  price: z.coerce.number().min(0, "Agreed price cannot be negative"),
  _id: z.string().optional(),
  id: z.string().optional(),
});

export const createAppointmentServiceItemSchema = z.preprocess((val) => {
  if (val && typeof val === "object" && !("serviceType" in val)) {
    if ("name" in val && typeof (val as { name: unknown }).name === "string") {
      return { ...(val as object), serviceType: "custom" };
    }
    return { ...(val as object), serviceType: "registered" };
  }
  return val;
}, z.discriminatedUnion("serviceType", [
  registeredServiceItemSchema,
  customServiceItemSchema,
]));

export const createAppointmentSchema = z
  .object({
    branchId: z.string().min(1, "Branch is required for appointment creation"),
    customerId: z.string().min(1, "Customer selection is required"),
    services: z.array(createAppointmentServiceItemSchema).optional(),
    serviceIds: z.array(z.string()).optional(),
    staffId: z.string().nullable().optional(),
    date: z.string().min(1, "Date is required"),
    startTime: z
      .string()
      .min(1, "Start time is required")
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time format must be HH:mm (e.g. 10:30)"),
    bookingType: z.enum(["advance", "walk_in"]),
    discount: z.coerce.number().min(0).optional(),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
    reminder: z
      .object({
        enabled: z.boolean(),
        channel: z.enum(["email", "sms", "both"]),
        offsetMinutes: z
          .number()
          .int("Offset must be an integer")
          .min(5, "Reminder offset must be at least 5 minutes"),
      })
      .optional(),
  })
  .refine(
    (data) => (data.services && data.services.length > 0) || (data.serviceIds && data.serviceIds.length > 0),
    {
      message: "At least one service must be selected",
      path: ["services"],
    }
  );

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
  reason: z
    .string()
    .max(300, "Reason cannot exceed 300 characters")
    .optional(),
  forceEarlyStart: z.boolean().optional(),
  allowOverdueStaffOverride: z.boolean().optional(),
});

export type UpdateStatusSchemaType = z.infer<typeof updateStatusSchema>;

export const registeredServiceModificationItemSchema = z.object({
  serviceType: z.literal("registered").optional(),
  serviceId: z.string().min(1, "Service ID is required"),
  customPrice: z.coerce.number().min(0, "Price must be a positive number").optional(),
  appliedSubscriptionId: z.string().nullable().optional(),
});

export const customServiceModificationItemSchema = z.object({
  serviceType: z.literal("custom"),
  name: z
    .string()
    .trim()
    .min(1, "Service name is required")
    .max(120, "Service name cannot exceed 120 characters"),
  duration: z.coerce
    .number()
    .int("Duration must be an integer")
    .min(1, "Duration must be at least 1 minute")
    .max(720, "Duration cannot exceed 720 minutes (12 hours)"),
  price: z.coerce.number().min(0, "Agreed price cannot be negative"),
  _id: z.string().optional(),
  id: z.string().optional(),
});

export const serviceModificationItemSchema = z.union([
  customServiceModificationItemSchema,
  registeredServiceModificationItemSchema,
  z.object({
    serviceId: z.string().min(1, "Service ID is required"),
    customPrice: z.coerce.number().min(0, "Price must be a positive number").optional(),
    appliedSubscriptionId: z.string().nullable().optional(),
  }),
]);

export const serviceModificationPreviewSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  services: z.array(serviceModificationItemSchema).min(1, "At least one service is required"),
  discount: z.coerce.number().min(0).optional(),
});

export type ServiceModificationPreviewSchemaType = z.infer<typeof serviceModificationPreviewSchema>;

export const serviceModificationCommitSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  previewToken: z.string().min(1, "Preview token is required"),
  services: z.array(serviceModificationItemSchema).min(1, "At least one service is required"),
  discount: z.coerce.number().min(0).optional(),
  managerOverrideReason: z.string().max(500).optional(),
});

export type ServiceModificationCommitSchemaType = z.infer<typeof serviceModificationCommitSchema>;

