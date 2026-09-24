import { describe, it, expect } from "vitest";
import { createSubscriptionPlanSchema } from "../schemas/plan.schema";

describe("Subscription Plan Schema Validation", () => {
  it("accepts a valid subscription plan template", () => {
    const valid = {
      name: "Luxury Grooming Pass",
      description: "6 haircuts and 3 beard grooming sessions",
      suggestedPrice: 4500,
      validityMonths: 6,
      entitlements: [
        { serviceId: "srv_haircut", quantity: 6 },
        { serviceId: "srv_beard", quantity: 3 },
      ],
      isActive: true,
    };

    const res = createSubscriptionPlanSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("fails if plan name is too short", () => {
    const invalid = {
      name: "A",
      suggestedPrice: 1000,
      validityMonths: 3,
      entitlements: [{ serviceId: "srv_1", quantity: 1 }],
    };

    const res = createSubscriptionPlanSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("fails if suggested price is negative", () => {
    const invalid = {
      name: "Hair Plan",
      suggestedPrice: -50,
      validityMonths: 3,
      entitlements: [{ serviceId: "srv_1", quantity: 1 }],
    };

    const res = createSubscriptionPlanSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("fails if entitlements array is empty", () => {
    const invalid = {
      name: "Empty Plan",
      suggestedPrice: 500,
      validityMonths: 1,
      entitlements: [],
    };

    const res = createSubscriptionPlanSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("fails if entitlement quantity is less than 1", () => {
    const invalid = {
      name: "Zero Qty Plan",
      suggestedPrice: 500,
      validityMonths: 1,
      entitlements: [{ serviceId: "srv_1", quantity: 0 }],
    };

    const res = createSubscriptionPlanSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });
});
