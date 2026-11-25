import { z } from "zod";

export const organizationSettingsSchema = z.object({
  organization: z.object({
    name: z.string().trim().min(1, "Organization name is required").max(120),
    expenseApprovalThreshold: z.number().min(0, "Must be 0 or greater"),
  }),
  profile: z.object({
    displayName: z.string().trim().max(120).nullable().optional(),
    email: z.string().trim().email("Invalid email").or(z.literal("")).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    website: z.string().trim().max(200).nullable().optional(),
  }),
  regional: z.object({
    timezone: z.string().trim().min(1, "Timezone is required"),
    currency: z.string().trim().min(3).max(5),
    locale: z.string().trim().min(2).max(20),
    dateFormat: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "DD-MM-YYYY"]),
    timeFormat: z.enum(["HH:mm", "hh:mm A"]),
    firstDayOfWeek: z.number().int().min(0).max(6),
  }),
  defaults: z.object({
    appointmentBufferMinutes: z.number().int().min(0).max(240),
    allowWalkIns: z.boolean(),
    allowAdvanceBookings: z.boolean(),
    reminderDefaultOffsetMinutes: z.number().int().min(0).max(10080),
    attendanceGraceMinutes: z.number().int().min(0).max(180),
    autoMarkAbsentAfterCutoff: z.boolean(),
    defaultWeeklyOffDays: z.array(z.number().int().min(0).max(6)).optional(),
    defaultHalfDayEligible: z.boolean(),
    exportRetentionHours: z.number().int().min(1).max(720).optional(),
  }),
});

export type OrganizationSettingsFormValues = z.infer<typeof organizationSettingsSchema>;

export const createHolidaySchema = z.object({
  branchId: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").nullable().optional(),
  eventType: z.enum([
    "public_holiday",
    "org_holiday",
    "branch_holiday",
    "branch_closure",
    "special_working_day",
  ]),
  name: z.string().trim().min(1, "Event name is required").max(120),
  description: z.string().trim().max(500).nullable().optional(),
  isPaid: z.boolean(),
});

export type CreateHolidayFormValues = z.infer<typeof createHolidaySchema>;

export const createLeavePolicySchema = z.object({
  branchId: z.string().nullable().optional(),
  code: z.string().trim().min(1, "Policy code is required").max(40),
  name: z.string().trim().min(1, "Policy name is required").max(100),
  description: z.string().trim().max(500).nullable().optional(),
  isPaid: z.boolean(),
  annualEntitlement: z.number().min(0).max(365),
  carryForwardLimit: z.number().min(0).max(365),
  allowHalfDay: z.boolean(),
  excludeHolidays: z.boolean(),
  excludeWeeklyOffs: z.boolean(),
  excessBehavior: z.enum(["convert_to_unpaid", "reject"]),
  allowNegativeBalance: z.boolean(),
  negativeBalancePayrollTreatment: z.enum(["unpaid_deduction", "carry_forward_debt", "none"]),
});

export type CreateLeavePolicyFormValues = z.infer<typeof createLeavePolicySchema>;
