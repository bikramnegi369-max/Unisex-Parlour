import { z } from "zod";
import {
  DISCRETE_STOCK_UNITS,
  ProductUsageType,
  StockUnit
} from "../types/inventory.types";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ObjectId format");

export const validateDecimalPrecision = (val: number): boolean => {
  if (typeof val !== "number" || isNaN(val)) return false;
  const str = val.toString();
  if (str.includes(".")) {
    const decimals = str.split(".")[1];
    return decimals.length <= 3;
  }
  return true;
};

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200).trim(),
  sku: z.string().min(1, "SKU is required").max(100).trim().toUpperCase(),
  category: z.string().min(1, "Category is required").max(100).trim(),
  usageType: z.enum(["retail_sale", "salon_consumption", "both"] as [ProductUsageType, ...ProductUsageType[]]),
  stockUnit: z.enum([
    "piece",
    "bottle",
    "box",
    "pack",
    "kit",
    "ml",
    "l",
    "g",
    "kg"
  ] as [StockUnit, ...StockUnit[]]),
  costPrice: z.coerce.number().min(0, "Cost price must be non-negative").default(0),
  sellingPrice: z.coerce.number().min(0, "Selling price must be non-negative").default(0),
  reorderLevel: z.coerce.number().min(0, "Reorder level must be non-negative").default(0),
  status: z.enum(["active", "inactive"]).default("active")
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const manualConsumptionSchema = z.object({
  branchId: objectIdSchema,
  productId: objectIdSchema,
  quantity: z.coerce
    .number()
    .positive("Quantity must be greater than zero")
    .refine(validateDecimalPrecision, "Quantity cannot exceed 3 decimal places"),
  serviceId: objectIdSchema.optional(),
  appointmentId: objectIdSchema.optional(),
  notes: z.string().max(1000).optional().default("")
});

export type ManualConsumptionInput = z.infer<typeof manualConsumptionSchema>;

export const stockAdjustmentSchema = z.object({
  branchId: objectIdSchema,
  productId: objectIdSchema,
  quantityDelta: z.coerce
    .number()
    .refine((val) => val !== 0, "Adjustment quantity delta cannot be zero")
    .refine((val) => validateDecimalPrecision(Math.abs(val)), "Quantity delta cannot exceed 3 decimal places"),
  reason: z.string().trim().min(1, "Adjustment reason is required").max(1000),
  notes: z.string().max(1000).optional().default("")
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export const stockTransferSchema = z
  .object({
    fromBranchId: objectIdSchema,
    toBranchId: objectIdSchema,
    productId: objectIdSchema,
    quantity: z.coerce
      .number()
      .positive("Transfer quantity must be greater than zero")
      .refine(validateDecimalPrecision, "Transfer quantity cannot exceed 3 decimal places"),
    notes: z.string().max(1000).optional().default("")
  })
  .refine((data) => data.fromBranchId !== data.toBranchId, {
    message: "Source and destination branch cannot be the same",
    path: ["toBranchId"]
  });

export type StockTransferInput = z.infer<typeof stockTransferSchema>;
