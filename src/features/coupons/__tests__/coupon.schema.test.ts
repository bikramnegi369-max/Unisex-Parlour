import { describe, it, expect } from "vitest";
import { couponFormSchema } from "../schemas/coupon.schema";

describe("Coupon Form Zod Schema Validation", () => {
  const baseValidData = {
    code: "SAVE20",
    description: "20% off summer campaign",
    discountType: "percentage" as const,
    discountValue: 20,
    validFrom: "2026-06-01T00:00:00.000Z",
    validUntil: "2026-06-30T23:59:59.999Z",
    status: "active" as const,
    enableTotalUsageLimit: false,
    totalUsageLimit: null,
    enablePerCustomerLimit: false,
    perCustomerLimit: null,
    excludedBranchIds: [],
  };

  it("successfully parses valid percentage coupon data", () => {
    const result = couponFormSchema.safeParse(baseValidData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("SAVE20");
      expect(result.data.discountType).toBe("percentage");
      expect(result.data.discountValue).toBe(20);
    }
  });

  it("successfully parses valid fixed amount coupon data", () => {
    const fixedData = {
      ...baseValidData,
      code: "FLAT500",
      discountType: "fixed" as const,
      discountValue: 500,
    };
    const result = couponFormSchema.safeParse(fixedData);
    expect(result.success).toBe(true);
  });

  it("trims whitespace from coupon code", () => {
    const unformattedCode = {
      ...baseValidData,
      code: "  SAVE50SPECIAL  ",
    };
    const result = couponFormSchema.safeParse(unformattedCode);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("SAVE50SPECIAL");
    }
  });

  it("fails if percentage discount exceeds 100", () => {
    const invalidPercentage = {
      ...baseValidData,
      discountType: "percentage" as const,
      discountValue: 105,
    };
    const result = couponFormSchema.safeParse(invalidPercentage);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("discountValue"))).toBe(true);
    }
  });

  it("fails if discount value is zero or negative", () => {
    const zeroDiscount = {
      ...baseValidData,
      discountValue: 0,
    };
    const result = couponFormSchema.safeParse(zeroDiscount);
    expect(result.success).toBe(false);

    const negativeDiscount = {
      ...baseValidData,
      discountValue: -10,
    };
    const negResult = couponFormSchema.safeParse(negativeDiscount);
    expect(negResult.success).toBe(false);
  });

  it("fails if validUntil is earlier than validFrom", () => {
    const invertedDates = {
      ...baseValidData,
      validFrom: "2026-06-30T00:00:00.000Z",
      validUntil: "2026-06-01T00:00:00.000Z",
    };
    const result = couponFormSchema.safeParse(invertedDates);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("validUntil"))).toBe(true);
    }
  });

  it("fails if validUntil equals validFrom", () => {
    const sameDates = {
      ...baseValidData,
      validFrom: "2026-06-01T12:00:00.000Z",
      validUntil: "2026-06-01T12:00:00.000Z",
    };
    const result = couponFormSchema.safeParse(sameDates);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("validUntil"))).toBe(true);
    }
  });

  it("requires totalUsageLimit when enableTotalUsageLimit is true", () => {
    const missingTotalLimit = {
      ...baseValidData,
      enableTotalUsageLimit: true,
      totalUsageLimit: null,
    };
    const result = couponFormSchema.safeParse(missingTotalLimit);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("totalUsageLimit"))).toBe(true);
    }
  });

  it("requires perCustomerLimit when enablePerCustomerLimit is true", () => {
    const missingCustomerLimit = {
      ...baseValidData,
      enablePerCustomerLimit: true,
      perCustomerLimit: null,
    };
    const result = couponFormSchema.safeParse(missingCustomerLimit);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("perCustomerLimit"))).toBe(true);
    }
  });

  it("accepts valid limits when boolean flags are enabled", () => {
    const validWithLimits = {
      ...baseValidData,
      enableTotalUsageLimit: true,
      totalUsageLimit: 100,
      enablePerCustomerLimit: true,
      perCustomerLimit: 2,
    };
    const result = couponFormSchema.safeParse(validWithLimits);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalUsageLimit).toBe(100);
      expect(result.data.perCustomerLimit).toBe(2);
    }
  });

  it("fails if coupon code contains disallowed characters", () => {
    const invalidCharData = {
      ...baseValidData,
      code: "COUPON@#$!",
    };
    const result = couponFormSchema.safeParse(invalidCharData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("code"))).toBe(true);
    }
  });
});
