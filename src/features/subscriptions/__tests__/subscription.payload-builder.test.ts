import { describe, it, expect } from "vitest";
import { buildSubscriptionPurchasePayload } from "../utils/buildSubscriptionPurchasePayload";
import type { CreateSubscriptionFormValues } from "../schemas/subscription.schema";

describe("Subscription Purchase Payload Alignment & Equivalence", () => {
  const sampleFormValues: CreateSubscriptionFormValues = {
    customerId: "6afefd61b107e0d89319123d",
    branchId: "6afefd61b107e0d89319123e",
    soldByStaffId: "6afefd61b107e0d89319123f",
    planId: "6afefd61b107e0d893191240",
    price: 3500,
    startDate: "2026-11-20",
    endDate: "2027-11-20",
    notes: "Upsold during appointment workflow",
    permittedBranchIds: ["6afefd61b107e0d89319123e", "all"],
    entitlements: [
      { serviceId: "6afefd61b107e0d893191241", quantity: 5 },
      { serviceId: "6afefd61b107e0d893191242", quantity: 2 },
    ],
  };

  it("1. Generates equivalent canonical payload from Subscription Page dialog", () => {
    const payload = buildSubscriptionPurchasePayload({
      values: sampleFormValues,
      effectiveBranchId: "6afefd61b107e0d89319123e",
    });

    expect(payload.customerId).toBe("6afefd61b107e0d89319123d");
    expect(payload.payerCustomerId).toBe("6afefd61b107e0d89319123d");
    expect(payload.price).toBe(3500);
    expect(payload.soldByStaffId).toBe("6afefd61b107e0d89319123f");
    expect(payload.planId).toBe("6afefd61b107e0d893191240");
    // Prunes 'all' sentinel
    expect(payload.permittedBranchIds).toEqual(["6afefd61b107e0d89319123e"]);
    // Populates both members array and root-level entitlements for dual-compatibility
    expect(payload.members).toHaveLength(1);
    expect(payload.members![0].customerId).toBe("6afefd61b107e0d89319123d");
    expect(payload.members![0].entitlements).toEqual([
      { serviceId: "6afefd61b107e0d893191241", quantity: 5 },
      { serviceId: "6afefd61b107e0d893191242", quantity: 2 },
    ]);
    expect(payload.entitlements).toEqual([
      { serviceId: "6afefd61b107e0d893191241", quantity: 5 },
      { serviceId: "6afefd61b107e0d893191242", quantity: 2 },
    ]);
  });

  it("2. Generates equivalent canonical payload from Create Appointment upsell", () => {
    // When invoked from CreateAppointmentDialog with selected customer
    const payload = buildSubscriptionPurchasePayload({
      values: {
        ...sampleFormValues,
        customerId: "", // even if dialog state is blank, uses defaultCustomerId
      },
      effectiveBranchId: "6afefd61b107e0d89319123e",
      defaultCustomerId: "6afefd61b107e0d89319123d",
    });

    expect(payload.customerId).toBe("6afefd61b107e0d89319123d");
    expect(payload.payerCustomerId).toBe("6afefd61b107e0d89319123d");
    expect(payload.members![0].customerId).toBe("6afefd61b107e0d89319123d");
    expect(payload.branchId).toBe("6afefd61b107e0d89319123e");
  });

  it("3. Generates equivalent canonical payload from Appointment Details upsell", () => {
    // When invoked from AppointmentDetailsDialog
    const payload = buildSubscriptionPurchasePayload({
      values: sampleFormValues,
      effectiveBranchId: "6afefd61b107e0d89319123e",
      defaultCustomerId: "6afefd61b107e0d89319123d",
    });

    expect(payload.customerId).toBe("6afefd61b107e0d89319123d");
    expect(payload.payerCustomerId).toBe("6afefd61b107e0d89319123d");
    expect(payload.price).toBe(3500);
    expect(payload.entitlements).toHaveLength(2);
  });

  it("4. Accurately builds multi-member payloads without leaking root entitlements", () => {
    const multiMemberValues: CreateSubscriptionFormValues = {
      ...sampleFormValues,
      members: [
        {
          customerId: "cust_member_1",
          permittedBranchIds: ["6afefd61b107e0d89319123e"],
          entitlements: [{ serviceId: "6afefd61b107e0d893191241", quantity: 3 }],
        },
        {
          customerId: "cust_member_2",
          permittedBranchIds: [],
          entitlements: [{ serviceId: "6afefd61b107e0d893191242", quantity: 4 }],
        },
      ],
      entitlements: undefined,
    };

    const payload = buildSubscriptionPurchasePayload({
      values: multiMemberValues,
      effectiveBranchId: "6afefd61b107e0d89319123e",
    });

    expect(payload.members).toHaveLength(2);
    expect(payload.members![0].customerId).toBe("cust_member_1");
    expect(payload.members![1].customerId).toBe("cust_member_2");
    expect(payload.entitlements).toBeUndefined();
  });
});
