import { describe, it, expect } from "vitest";
import {
  createSubscriptionSchema,
  cancelSubscriptionSchema,
  renewSubscriptionSchema,
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

    it("rejects zero price (subscription sale price must be greater than 0)", () => {
      const result = createSubscriptionSchema.safeParse({
        ...validData,
        price: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("greater than 0");
      }
    });

    it("rejects negative price", () => {
      const result = createSubscriptionSchema.safeParse({
        ...validData,
        price: -100,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("greater than 0");
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
    it("accepts valid multi-member subscription input", () => {
      const multiMemberData = {
        customerId: "cust_payer_1",
        price: 3000,
        members: [
          {
            customerId: "cust_payer_1",
            entitlements: [{ serviceId: "srv_haircut", quantity: 3 }],
          },
          {
            customerId: "cust_family_2",
            entitlements: [{ serviceId: "srv_facial", quantity: 2 }],
          },
        ],
        permittedBranchIds: ["br_1"],
        startDate: "2026-09-01",
        endDate: "2027-03-01",
        notes: "Family Package",
      };
      const result = createSubscriptionSchema.safeParse(multiMemberData);
      expect(result.success).toBe(true);
    });

    it("rejects duplicate beneficiary members in multi-member subscription", () => {
      const duplicateMemberData = {
        customerId: "cust_payer_1",
        price: 3000,
        members: [
          {
            customerId: "cust_family_2",
            entitlements: [{ serviceId: "srv_haircut", quantity: 3 }],
          },
          {
            customerId: "cust_family_2",
            entitlements: [{ serviceId: "srv_facial", quantity: 2 }],
          },
        ],
        permittedBranchIds: ["br_1"],
        startDate: "2026-09-01",
        endDate: "2027-03-01",
      };
      const result = createSubscriptionSchema.safeParse(duplicateMemberData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Duplicate beneficiary members");
      }
    });

    it("rejects duplicate services within the same member entitlements", () => {
      const duplicateServiceMemberData = {
        customerId: "cust_payer_1",
        price: 3000,
        members: [
          {
            customerId: "cust_family_2",
            entitlements: [
              { serviceId: "srv_haircut", quantity: 3 },
              { serviceId: "srv_haircut", quantity: 2 },
            ],
          },
        ],
        permittedBranchIds: ["br_1"],
        startDate: "2026-09-01",
        endDate: "2027-03-01",
      };
      const result = createSubscriptionSchema.safeParse(duplicateServiceMemberData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Duplicate services");
      }
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

  describe("renewSubscriptionSchema", () => {
    it("accepts valid renewal data with endDate, price, and notes", () => {
      const result = renewSubscriptionSchema.safeParse({
        endDate: "2027-09-01",
        price: 2500,
        notes: "Seasonal renewal",
      });
      expect(result.success).toBe(true);
    });

    it("accepts renewal without price or notes", () => {
      const result = renewSubscriptionSchema.safeParse({
        endDate: "2027-09-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing endDate", () => {
      const result = renewSubscriptionSchema.safeParse({
        price: 2500,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative renewal price", () => {
      const result = renewSubscriptionSchema.safeParse({
        endDate: "2027-09-01",
        price: -100,
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
