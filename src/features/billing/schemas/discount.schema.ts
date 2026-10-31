import { z } from "zod";

export const discountLevelEnum = z.enum(["line", "selected_lines", "invoice"], {
  message: "Discount level must be line, selected_lines, or invoice",
});

export const discountTypeEnum = z.enum(["fixed", "percentage"], {
  message: "Discount type must be either fixed or percentage",
});

export const applyDiscountSchema = z
  .object({
    branchId: z.string().min(1, "Active branch is required"),
    discountLevel: discountLevelEnum,
    lineId: z.string().optional(),
    lineIds: z.array(z.string()).optional(),
    name: z.string().max(100, "Discount name cannot exceed 100 characters").optional(),
    discountType: discountTypeEnum,
    enteredValue: z.coerce
      .number()
      .positive("Discount value must be greater than 0"),
    reason: z
      .string()
      .min(3, "Reason must be at least 3 characters")
      .max(500, "Reason cannot exceed 500 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.discountLevel === "line" && (!data.lineId || data.lineId.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lineId"],
        message: "Line item is required for line-level discounts",
      });
    }
    if (data.discountLevel === "selected_lines" && (!data.lineIds || data.lineIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lineIds"],
        message: "At least one service must be selected",
      });
    }
    if (data.discountType === "percentage" && data.enteredValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["enteredValue"],
        message: "Percentage discount cannot exceed 100%",
      });
    }
  });

export type ApplyDiscountFormValues = z.infer<typeof applyDiscountSchema>;

export const modifyDiscountSchema = z
  .object({
    branchId: z.string().min(1, "Active branch is required"),
    discountType: discountTypeEnum.optional(),
    enteredValue: z.coerce
      .number()
      .positive("Discount value must be greater than 0"),
    reason: z
      .string()
      .min(3, "Reason must be at least 3 characters")
      .max(500, "Reason cannot exceed 500 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "percentage" && data.enteredValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["enteredValue"],
        message: "Percentage discount cannot exceed 100%",
      });
    }
  });

export type ModifyDiscountFormValues = z.infer<typeof modifyDiscountSchema>;

export const removeDiscountSchema = z.object({
  branchId: z.string().min(1, "Active branch is required"),
  reason: z
    .string()
    .min(3, "Reason must be at least 3 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

export type RemoveDiscountFormValues = z.infer<typeof removeDiscountSchema>;
