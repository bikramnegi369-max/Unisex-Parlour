import { describe, it, expect } from "vitest";
import {
  createProductSchema,
  manualConsumptionSchema,
  stockAdjustmentSchema,
  stockTransferSchema,
  validateDecimalPrecision
} from "../schemas/inventory.schema";

describe("Inventory MVP Zod Schemas Validation", () => {
  describe("validateDecimalPrecision helper", () => {
    it("should accept integers and numbers up to 3 decimals", () => {
      expect(validateDecimalPrecision(10)).toBe(true);
      expect(validateDecimalPrecision(10.5)).toBe(true);
      expect(validateDecimalPrecision(10.55)).toBe(true);
      expect(validateDecimalPrecision(10.555)).toBe(true);
    });

    it("should reject numbers exceeding 3 decimals", () => {
      expect(validateDecimalPrecision(10.5555)).toBe(false);
      expect(validateDecimalPrecision(0.0001)).toBe(false);
    });
  });

  describe("createProductSchema", () => {
    it("should accept valid product payloads for both, salon_consumption, and retail_sale", () => {
      const validBoth = {
        name: "L'Oreal Shampoo",
        sku: "LOR-SHAMP-01",
        category: "Hair Care",
        usageType: "both",
        stockUnit: "bottle",
        costPrice: 450,
        sellingPrice: 800,
        reorderLevel: 10,
        status: "active"
      };

      const result = createProductSchema.safeParse(validBoth);
      expect(result.success).toBe(true);
    });

    it("should reject empty names and invalid usage types", () => {
      const invalid = {
        name: "   ",
        sku: "TEST-SKU",
        category: "General",
        usageType: "invalid_type",
        stockUnit: "piece"
      };

      const result = createProductSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("manualConsumptionSchema", () => {
    const validObjectId = "507f1f77bcf86cd799439011";

    it("should allow positive quantities up to 3 decimals", () => {
      const valid = {
        branchId: validObjectId,
        productId: validObjectId,
        quantity: 12.345,
        notes: "Used in hair spa"
      };
      const result = manualConsumptionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject zero or negative quantities", () => {
      const invalidZero = {
        branchId: validObjectId,
        productId: validObjectId,
        quantity: 0
      };
      expect(manualConsumptionSchema.safeParse(invalidZero).success).toBe(false);

      const invalidNegative = {
        branchId: validObjectId,
        productId: validObjectId,
        quantity: -5
      };
      expect(manualConsumptionSchema.safeParse(invalidNegative).success).toBe(false);
    });

    it("should reject quantities exceeding 3 decimal places", () => {
      const invalid = {
        branchId: validObjectId,
        productId: validObjectId,
        quantity: 1.2345
      };
      expect(manualConsumptionSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("stockAdjustmentSchema", () => {
    const validObjectId = "507f1f77bcf86cd799439011";

    it("should allow positive or negative delta with non-empty reason", () => {
      const validPositive = {
        branchId: validObjectId,
        productId: validObjectId,
        quantityDelta: 15,
        reason: "Inventory audit count"
      };
      expect(stockAdjustmentSchema.safeParse(validPositive).success).toBe(true);

      const validNegative = {
        branchId: validObjectId,
        productId: validObjectId,
        quantityDelta: -2.5,
        reason: "Broken bottle"
      };
      expect(stockAdjustmentSchema.safeParse(validNegative).success).toBe(true);
    });

    it("should reject zero delta and empty reason", () => {
      const invalidZero = {
        branchId: validObjectId,
        productId: validObjectId,
        quantityDelta: 0,
        reason: "Reconciliation"
      };
      expect(stockAdjustmentSchema.safeParse(invalidZero).success).toBe(false);

      const invalidEmptyReason = {
        branchId: validObjectId,
        productId: validObjectId,
        quantityDelta: 5,
        reason: "   "
      };
      expect(stockAdjustmentSchema.safeParse(invalidEmptyReason).success).toBe(false);
    });
  });

  describe("stockTransferSchema", () => {
    const branchA = "507f1f77bcf86cd799439011";
    const branchB = "507f1f77bcf86cd799439022";
    const productId = "507f1f77bcf86cd799439033";

    it("should allow valid transfers between distinct branches", () => {
      const valid = {
        fromBranchId: branchA,
        toBranchId: branchB,
        productId: productId,
        quantity: 5
      };
      expect(stockTransferSchema.safeParse(valid).success).toBe(true);
    });

    it("should reject transfers where source and destination branches are identical", () => {
      const invalidSameBranch = {
        fromBranchId: branchA,
        toBranchId: branchA,
        productId: productId,
        quantity: 5
      };
      const result = stockTransferSchema.safeParse(invalidSameBranch);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Source and destination branch cannot be the same");
      }
    });
  });
});
