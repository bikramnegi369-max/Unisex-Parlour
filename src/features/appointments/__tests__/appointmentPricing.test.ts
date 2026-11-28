import { describe, it, expect } from "vitest";
import {
  computeAppointmentFinancialBreakdown,
  resolveServiceMembershipCode,
  resolveServiceSubscriptionCode,
} from "../utils/appointmentPricing";

describe("Frontend Appointment Financial Breakdown", () => {
  it("computes exact breakdown for Subscription + Membership (APT-20261128-0014)", () => {
    const breakdown = computeAppointmentFinancialBreakdown({
      services: [
        {
          serviceId: "s1",
          name: "D-Tan Face (O3+)",
          price: 1000,
          duration: 30,
          appliedSubscriptionId: { _id: "sub1", subscriptionCode: "SUB-20261126-0003" } as unknown as string,
          isRedeemedViaSubscription: true,
        },
        {
          serviceId: "s2",
          name: "Rica Wax Arms Full",
          price: 700,
          duration: 30,
          appliedSubscriptionId: "sub1",
          subscriptionCode: "SUB-20261126-0003",
          isRedeemedViaSubscription: true,
        },
        {
          serviceId: "s3",
          name: "Air Brush HD Party Make-up",
          price: 10000,
          duration: 60,
          appliedCustomerMembershipId: "mem1",
          membershipCode: "MEM-20261125-0007-1",
          membershipDiscountPercentage: 20,
          membershipDiscountAmount: 2000,
        },
        {
          serviceId: "s4",
          name: "Air Brush HD Engagement Make-up",
          price: 15000,
          duration: 90,
          appliedCustomerMembershipId: "mem1",
          membershipCode: "MEM-20261125-0007-1",
          membershipDiscountPercentage: 20,
          membershipDiscountAmount: 3000,
        },
      ],
      pricing: {
        subtotal: 26700,
        discount: 5000,
        total: 21700,
      },
    });

    expect(breakdown.grossSubtotal).toBe(26700);
    expect(breakdown.subscriptionWaivedAmount).toBe(1700);
    expect(breakdown.membershipDiscountAmount).toBe(5000);
    expect(breakdown.manualDiscountAmount).toBe(0);
    expect(breakdown.netPayable).toBe(20000);
    expect(breakdown.membershipCodes).toEqual(["MEM-20261125-0007-1"]);
  });

  it("handles missing membership details gracefully without crashing", () => {
    const breakdown = computeAppointmentFinancialBreakdown({
      services: [{ serviceId: "s1", name: "Haircut", price: 500, duration: 30 }],
      pricing: { subtotal: 500, discount: 0, total: 500 },
    });
    expect(breakdown.netPayable).toBe(500);
    expect(breakdown.membershipCodes).toEqual([]);
    expect(resolveServiceMembershipCode(null)).toBeNull();
    expect(resolveServiceSubscriptionCode(null)).toBeNull();
  });

  it("extracts subscriptionCode from populated appliedSubscriptionId", () => {
    const code = resolveServiceSubscriptionCode({
      appliedSubscriptionId: { subscriptionCode: "SUB-20261126-0003" } as unknown as string,
    });
    expect(code).toBe("SUB-20261126-0003");
  });

  it("distinguishes zero vs non-zero manual concessions", () => {
    const zeroManual = computeAppointmentFinancialBreakdown({
      services: [{ serviceId: "s1", name: "Facial", price: 2000, duration: 45 }],
      pricing: { subtotal: 2000, discount: 0, total: 2000 },
    });
    expect(zeroManual.manualDiscountAmount).toBe(0);

    const withManual = computeAppointmentFinancialBreakdown({
      services: [{ serviceId: "s1", name: "Facial", price: 2000, duration: 45 }],
      pricing: { subtotal: 2000, discount: 250, total: 1750 },
    });
    expect(withManual.manualDiscountAmount).toBe(250);
    expect(withManual.netPayable).toBe(1750);
  });
});
