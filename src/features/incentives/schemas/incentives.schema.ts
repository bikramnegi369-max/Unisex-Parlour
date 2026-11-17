import { z } from "zod";

const rupeesToPaisePrecision = (value: number) => {
  const paise = value * 100;
  return Number.isSafeInteger(Math.round(paise)) &&
    Math.abs(paise - Math.round(paise)) < 1e-7;
};

const rupeeAmountSchema = z
  .coerce
  .number()
  .finite()
  .min(0)
  .refine(rupeesToPaisePrecision, "Enter an amount with up to two decimal places.");

export const tierFormSchema = z.object({
  minRupees: rupeeAmountSchema,
  maxRupees: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    rupeeAmountSchema.nullable(),
  ),
  percentage: z.coerce.number().finite().min(0).max(100, "Percentage must be between 0 and 100")
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, "Use up to two decimal places."),
  fixedRupees: rupeeAmountSchema,
}).superRefine(({ minRupees, maxRupees }, context) => {
  if (maxRupees !== null && maxRupees < minRupees) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxRupees"],
      message: "Maximum must be greater than or equal to minimum.",
    });
  }
});

export const schemeFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(40)
    .toUpperCase(),
  description: z.string().trim().max(500).optional(),
  schemeType: z.enum(["COMMISSION", "ATTENDANCE_BONUS"]),
  calculationBasis: z.enum([
    "SERVICE_NET_REVENUE",
    "SUBSCRIPTION_NET_REVENUE",
    "MEMBERSHIP_NET_REVENUE",
    "PRODUCT_NET_REVENUE",
    "ATTENDANCE_DAYS",
  ]),
  fixedAmountRupees: rupeeAmountSchema,
  minimumAttendanceDays: z.coerce.number().int().min(0).max(31),
  tiers: z.array(tierFormSchema),
}).superRefine((values, context) => {
  if (
    values.schemeType === "ATTENDANCE_BONUS" &&
    (values.calculationBasis !== "ATTENDANCE_DAYS" ||
      values.minimumAttendanceDays < 1 ||
      values.fixedAmountRupees <= 0 ||
      values.tiers.length > 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schemeType"],
      message: "Attendance bonuses require a positive fixed amount, minimum attendance days, and no commission tiers.",
    });
  }
  if (
    values.schemeType === "COMMISSION" &&
    ![
      "SERVICE_NET_REVENUE",
      "SUBSCRIPTION_NET_REVENUE",
      "MEMBERSHIP_NET_REVENUE",
    "PRODUCT_NET_REVENUE",
    ].includes(values.calculationBasis)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["calculationBasis"],
      message: "Choose an enabled service, subscription sale, membership sale, or retail sale category.",
    });
  }
});

export type SchemeFormValues = z.infer<typeof schemeFormSchema>;

export const assignmentFormSchema = z.object({
  schemeId: z.string().min(1, "Please select an incentive scheme"),
  scopeType: z.enum(["ORGANIZATION", "BRANCH", "STAFF"]),
  scopeId: z.string().optional().nullable(),
  startDate: z.string().min(1, "Effective start date is required"),
  endDate: z.string().optional().nullable(),
  priority: z.coerce.number().int(),
}).superRefine((values, context) => {
  if (values.scopeType !== "ORGANIZATION" && !values.scopeId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["scopeId"],
      message: "Choose a staff member or branch for this assignment.",
    });
  }
  if (values.endDate && values.endDate <= values.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be after the start date.",
    });
  }
});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

export const previewFormSchema = z.object({
  schemeId: z.string().optional(),
  staffId: z.string().optional(),
  revenueRupees: z.coerce.number().min(0, "Revenue amount must be non-negative"),
});

export type PreviewFormValues = z.infer<typeof previewFormSchema>;
