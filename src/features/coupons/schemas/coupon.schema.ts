import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ObjectId format");

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "Coupon code must be at least 2 characters")
      .max(50, "Coupon code cannot exceed 50 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Code may only contain letters, numbers, hyphens and underscores"),
    description: z.string().trim().max(1000, "Description cannot exceed 1000 characters").optional(),
    discountType: z.enum(["fixed", "percentage"]),
    discountValue: z
      .number()
      .positive("Discount value must be greater than 0"),
    validFrom: z
      .string()
      .min(1, "Start date is required"),
    validUntil: z
      .string()
      .min(1, "End date is required"),
    status: z.enum(["active", "inactive"]).default("active"),
    enableTotalUsageLimit: z.boolean().default(false),
    totalUsageLimit: z
      .number()
      .int("Limit must be a whole number")
      .positive("Limit must be at least 1")
      .nullable()
      .optional(),
    enablePerCustomerLimit: z.boolean().default(false),
    perCustomerLimit: z
      .number()
      .int("Limit must be a whole number")
      .positive("Limit must be at least 1")
      .nullable()
      .optional(),
    excludedBranchIds: z.array(objectIdSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.discountType === "percentage") {
        return data.discountValue <= 100;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100%",
      path: ["discountValue"],
    }
  )
  .refine(
    (data) => {
      if (!data.validFrom || !data.validUntil) return true;
      const start = new Date(data.validFrom).getTime();
      const end = new Date(data.validUntil).getTime();
      return end > start;
    },
    {
      message: "End date must be strictly after the start date",
      path: ["validUntil"],
    }
  )
  .refine(
    (data) => {
      if (data.enableTotalUsageLimit && (!data.totalUsageLimit || data.totalUsageLimit <= 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Please enter a valid total usage limit greater than 0",
      path: ["totalUsageLimit"],
    }
  )
  .refine(
    (data) => {
      if (data.enablePerCustomerLimit && (!data.perCustomerLimit || data.perCustomerLimit <= 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Please enter a valid per-customer limit greater than 0",
      path: ["perCustomerLimit"],
    }
  );

export type CouponFormValues = z.infer<typeof couponFormSchema>;
export type CouponFormInput = z.input<typeof couponFormSchema>;
