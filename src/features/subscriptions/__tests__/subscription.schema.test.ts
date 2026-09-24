import { describe, it, expect } from "vitest";
import {
  createSubscriptionSchema,
  cancelSubscriptionSchema,
  redeemSubscriptionSchema,
} from "../schemas/subscription.schema";

describe("Subscription Zod Schemas", () => {
  describe("createSubscriptionSchema", () => {
    const validData = {
      customerId: "cust_1",
      price: 1500,
      entitlements: [
        { serviceId: "srv_1", quantity: 5 },
        { serviceId: "srv_2", quantity: 2 },
      ],
      permittedBranchIds: ["br_1"],
      startDate: "2026-09-01",
      endDate: "2027-03-01",
      notes: "Promo package",
    };

    it("accepts valid subscription input with positive price and unique services", () => {
      const result = createSubscriptionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("accepts zero price (e.g. complimentary subscription)", () => {
      const result = createSubscriptionSchema.safeParse({
        ...validData,
        price: 0,
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative price", () => {
      const result = createSubscriptionSchema.safeParse({
        ...validData,
        price: -100,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("greater than or equal to 0");
      }
    });

    it("rejects non-integer or zero/negative quantities in entitlements", () => {
      const zeroQty = createSubscriptionSchema.safeParse({
        ...validData,
        entitlements: [{ serviceId: "srv_1", quantity: 0 }],
      });
      expect(zeroQty.success).toBe(false);

      const decimalQty = createSubscriptionSchema.safeParse({
        ...validData,
        entitlements: [{ serviceId: "srv_1", quantity: 2.5 }],
      });
      expect(decimalQty.success).toBe(false);
    });

    it("rejects duplicate services in entitlements", () => {
      const result = createSubscriptionSchema.safeParse({
        ...validData,
        entitlements: [
          { serviceId: "srv_1", quantity: 2 },
          { serviceId: "srv_1", quantity: 3 },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Duplicate services are not allowed");
      }
    });

    it("rejects when end date precedes start date", () => {
      const result = createSubscriptionSchema.safeParse({
        ...validData,
        startDate: "2027-01-01",
        endDate: "2026-01-01",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("End date must not precede start date");
      }
    });

    it("rejects when customerId is missing", () => {
      const result = createSubscriptionSchema.safeParse({
        ...validData,
        customerId: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty entitlements list", () => {
      const result = createSubscriptionSchema.safeParse({
        ...validData,
        entitlements: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cancelSubscriptionSchema", () => {
    it("accepts non-empty cancellation reason", () => {
      const result = cancelSubscriptionSchema.safeParse({
        reason: "Customer moved to another city",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty cancellation reason", () => {
      const result = cancelSubscriptionSchema.safeParse({
        reason: "   ",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("redeemSubscriptionSchema", () => {
    it("accepts valid redemption with OTP and service quantities", () => {
      const result = redeemSubscriptionSchema.safeParse({
        otp: "123456",
        services: [{ serviceId: "srv_1", quantity: 1 }],
        appointmentId: "apt_1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects OTP shorter than 4 characters", () => {
      const result = redeemSubscriptionSchema.safeParse({
        otp: "12",
        services: [{ serviceId: "srv_1", quantity: 1 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty services array in redemption", () => {
      const result = redeemSubscriptionSchema.safeParse({
        otp: "123456",
        services: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
