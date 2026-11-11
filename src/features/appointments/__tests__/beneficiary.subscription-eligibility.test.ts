import { describe, it, expect } from "vitest";
import { mapSubscriptionKeys } from "@/features/subscriptions/api/subscriptions.api";
import type { RawSubscriptionDTO } from "@/features/subscriptions/api/subscriptions.api";
import type { Subscription } from "@/features/subscriptions/types/subscription.types";

/**
 * Pure helper mirroring the eligibility selection algorithm in CreateAppointmentDialog
 */
function getEligibleSubscriptionsForCustomer(
  activeSubscriptions: Subscription[],
  watchedCustomerId: string,
  effectiveBranchId?: string,
) {
  const map = new Map<
    string,
    Array<{
      subscriptionId: string;
      subscriptionCode: string;
      remaining: number;
      used: number;
      total: number;
      endDate?: string;
      status?: string;
      paymentStatus?: string;
      amountDue?: number;
      isPaid?: boolean;
      isRedeemable: boolean;
    }>
  >();

  for (const sub of activeSubscriptions) {
    const members = sub.members;
    const hasMembersArray = Array.isArray(members);
    const memberEntry = hasMembersArray
      ? members.find((m) => m.customerId === watchedCustomerId)
      : undefined;

    // If subscription has a members array defined:
    // - Must contain the appointment customer as a member.
    // - If customer is not a member, exclude this subscription entirely from eligible coverage.
    if (hasMembersArray && !memberEntry) {
      continue;
    }

    // Subscription-level branch restriction check:
    if (
      effectiveBranchId &&
      sub.permittedBranchIds &&
      sub.permittedBranchIds.length > 0 &&
      !sub.permittedBranchIds.includes(effectiveBranchId)
    ) {
      continue;
    }

    // Member-level branch restriction check:
    if (
      effectiveBranchId &&
      memberEntry?.permittedBranchIds &&
      memberEntry.permittedBranchIds.length > 0 &&
      !memberEntry.permittedBranchIds.includes(effectiveBranchId)
    ) {
      continue;
    }

    // Determine candidate entitlements:
    // - For member-based subscriptions, strictly use the matching customer's own member entitlements.
    // - For genuine legacy single-customer subscriptions (where members array is absent), fall back to sub.entitlements.
    const candidateEntitlements = memberEntry
      ? memberEntry.entitlements || []
      : sub.entitlements || [];

    for (const ent of candidateEntitlements) {
      const isRedeemable = ent.isRedeemable !== false;
      if (ent.remainingQuantity > 0 && isRedeemable) {
        const list = map.get(ent.serviceId) || [];
        list.push({
          subscriptionId: sub.id,
          subscriptionCode: sub.subscriptionCode,
          remaining: ent.remainingQuantity,
          used: ent.usedQuantity || 0,
          total: ent.totalQuantity,
          endDate: sub.endDate,
          status: sub.status,
          paymentStatus: sub.paymentStatus,
          amountDue: sub.amountDue,
          isPaid: sub.isPaid,
          isRedeemable,
        });
        map.set(ent.serviceId, list);
      }
    }
  }

  // Sort each list deterministically by earliest expiration date (FIFO)
  map.forEach((list) => {
    list.sort((a, b) => {
      const timeA = a.endDate ? new Date(a.endDate).getTime() : Infinity;
      const timeB = b.endDate ? new Date(b.endDate).getTime() : Infinity;
      return timeA - timeB;
    });
  });

  return map;
}

describe("Beneficiary Subscription Eligibility — Frontend Regression Suite", () => {
  const multiMemberRaw: RawSubscriptionDTO = {
    _id: "sub_multi_family",
    subscriptionCode: "SUB-FAM-001",
    customerId: "cust_payer", // Payer
    payerId: "cust_payer",
    status: "active",
    permittedBranchIds: ["branch_main", "branch_downtown"],
    // Legacy root entitlements compatibility projection from backend (represents Member A's entitlements)
    entitlements: [
      {
        serviceId: "srv_haircut",
        serviceName: "Classic Haircut",
        totalQuantity: 5,
        usedQuantity: 1,
        remainingQuantity: 4,
        isRedeemable: true,
      },
    ],
    members: [
      {
        customerId: "cust_member_a",
        status: "active",
        permittedBranchIds: ["branch_main"],
        entitlements: [
          {
            serviceId: "srv_haircut",
            serviceName: "Classic Haircut",
            totalQuantity: 5,
            usedQuantity: 1,
            remainingQuantity: 4,
            isRedeemable: true,
          },
        ],
      },
      {
        customerId: "cust_member_b",
        status: "active",
        permittedBranchIds: ["branch_main", "branch_downtown"],
        entitlements: [
          {
            serviceId: "srv_spa",
            serviceName: "Head Spa",
            totalQuantity: 2,
            usedQuantity: 0,
            remainingQuantity: 2,
            isRedeemable: true,
          },
        ],
      },
    ],
  };

  it("1. Beneficiary A sees only A's allocated entitlements", () => {
    const sub = mapSubscriptionKeys(multiMemberRaw);
    const eligibilityMap = getEligibleSubscriptionsForCustomer([sub], "cust_member_a", "branch_main");

    // Member A should only see haircut (remaining: 4)
    const haircutCoverage = eligibilityMap.get("srv_haircut");
    expect(haircutCoverage).toBeDefined();
    expect(haircutCoverage?.[0].remaining).toBe(4);
    expect(haircutCoverage?.[0].subscriptionId).toBe("sub_multi_family");

    // Member A must NOT see Member B's Head Spa
    const spaCoverage = eligibilityMap.get("srv_spa");
    expect(spaCoverage).toBeUndefined();
  });

  it("2. Beneficiary B sees only B's allocated entitlements", () => {
    const sub = mapSubscriptionKeys(multiMemberRaw);
    const eligibilityMap = getEligibleSubscriptionsForCustomer([sub], "cust_member_b", "branch_main");

    // Member B should only see spa (remaining: 2)
    const spaCoverage = eligibilityMap.get("srv_spa");
    expect(spaCoverage).toBeDefined();
    expect(spaCoverage?.[0].remaining).toBe(2);
    expect(spaCoverage?.[0].subscriptionId).toBe("sub_multi_family");

    // Member B must NOT see Member A's Haircut
    const haircutCoverage = eligibilityMap.get("srv_haircut");
    expect(haircutCoverage).toBeUndefined();
  });

  it("3. A payer who is not a member cannot use the first member's root-projected entitlements", () => {
    const sub = mapSubscriptionKeys(multiMemberRaw);
    // Payer cust_payer is not in the members array
    const eligibilityMap = getEligibleSubscriptionsForCustomer([sub], "cust_payer", "branch_main");

    // The subscription must be excluded entirely; payer must NOT receive root entitlements
    expect(eligibilityMap.get("srv_haircut")).toBeUndefined();
    expect(eligibilityMap.get("srv_spa")).toBeUndefined();
    expect(eligibilityMap.size).toBe(0);
  });

  it("4. An explicit members: [] is not treated as a legacy subscription", () => {
    const explicitEmptyMembersRaw: RawSubscriptionDTO = {
      _id: "sub_empty_members",
      subscriptionCode: "SUB-EMPTY-001",
      customerId: "cust_payer",
      status: "active",
      entitlements: [
        {
          serviceId: "srv_haircut",
          serviceName: "Classic Haircut",
          totalQuantity: 3,
          usedQuantity: 0,
          remainingQuantity: 3,
          isRedeemable: true,
        },
      ],
      members: [], // Explicitly present as empty
    };

    const sub = mapSubscriptionKeys(explicitEmptyMembersRaw);

    // Mapper must preserve empty array and NOT synthesize a legacy member
    expect(sub.members).toBeDefined();
    expect(sub.members).toHaveLength(0);

    // Appointment eligibility must exclude it and NOT leak root entitlements
    const eligibilityMap = getEligibleSubscriptionsForCustomer([sub], "cust_payer", "branch_main");
    expect(eligibilityMap.get("srv_haircut")).toBeUndefined();
    expect(eligibilityMap.size).toBe(0);
  });

  it("5. A member restricted to another branch cannot select that subscription at the current branch", () => {
    const sub = mapSubscriptionKeys(multiMemberRaw);

    // Member A is restricted to "branch_main". Attempting booking at "branch_downtown"
    const downtownMapA = getEligibleSubscriptionsForCustomer([sub], "cust_member_a", "branch_downtown");
    expect(downtownMapA.get("srv_haircut")).toBeUndefined();
    expect(downtownMapA.size).toBe(0);

    // Member B has both ["branch_main", "branch_downtown"]. Booking at "branch_downtown" is allowed
    const downtownMapB = getEligibleSubscriptionsForCustomer([sub], "cust_member_b", "branch_downtown");
    expect(downtownMapB.get("srv_spa")).toBeDefined();
    expect(downtownMapB.get("srv_spa")?.[0].remaining).toBe(2);

    // Normalizing populated branch IDs ({ _id: "branch_main" })
    const populatedMemberBranchRaw: RawSubscriptionDTO = {
      _id: "sub_pop_branch",
      subscriptionCode: "SUB-POP-001",
      customerId: "cust_single",
      status: "active",
      members: [
        {
          customerId: "cust_single",
          status: "active",
          permittedBranchIds: [{ _id: "branch_main" } as unknown as string],
          entitlements: [
            {
              serviceId: "srv_haircut",
              remainingQuantity: 1,
              totalQuantity: 1,
              isRedeemable: true,
            },
          ],
        },
      ],
    };
    const mappedPopSub = mapSubscriptionKeys(populatedMemberBranchRaw);
    expect(mappedPopSub.members?.[0].permittedBranchIds).toEqual(["branch_main"]);
  });

  it("6. A genuine legacy subscription without a members field remains compatible", () => {
    const legacyRaw: RawSubscriptionDTO = {
      _id: "sub_legacy_001",
      subscriptionCode: "SUB-LEGACY",
      customerId: "cust_legacy",
      status: "active",
      // members is completely absent / undefined
      entitlements: [
        {
          serviceId: "srv_haircut",
          serviceName: "Classic Haircut",
          totalQuantity: 2,
          usedQuantity: 0,
          remainingQuantity: 2,
          isRedeemable: true,
        },
      ],
    };

    const sub = mapSubscriptionKeys(legacyRaw);

    // Synthesized legacy member is generated for backwards compatibility
    expect(sub.members).toBeDefined();
    expect(sub.members).toHaveLength(1);
    expect(sub.members?.[0].customerId).toBe("cust_legacy");
    expect(sub.members?.[0].entitlements[0].serviceId).toBe("srv_haircut");

    // Eligibility check allows cust_legacy to use the subscription
    const eligibilityMap = getEligibleSubscriptionsForCustomer([sub], "cust_legacy");
    const haircutCoverage = eligibilityMap.get("srv_haircut");
    expect(haircutCoverage).toBeDefined();
    expect(haircutCoverage?.[0].remaining).toBe(2);
    expect(haircutCoverage?.[0].subscriptionId).toBe("sub_legacy_001");

    // Other customers cannot access it
    const otherMap = getEligibleSubscriptionsForCustomer([sub], "cust_other");
    expect(otherMap.size).toBe(0);
  });

  it("7. Existing FIFO subscription selection and multiple-subscription appointment behaviour remain unchanged", () => {
    const earlySub = mapSubscriptionKeys({
      _id: "sub_fifo_early",
      subscriptionCode: "SUB-EARLY",
      customerId: "cust_fifo",
      endDate: "2026-06-01T00:00:00.000Z",
      status: "active",
      entitlements: [
        {
          serviceId: "srv_haircut",
          remainingQuantity: 1,
          usedQuantity: 1,
          totalQuantity: 2,
          isRedeemable: true,
        },
      ],
    });

    const lateSub = mapSubscriptionKeys({
      _id: "sub_fifo_late",
      subscriptionCode: "SUB-LATE",
      customerId: "cust_fifo",
      endDate: "2026-12-01T00:00:00.000Z",
      status: "active",
      entitlements: [
        {
          serviceId: "srv_haircut",
          remainingQuantity: 3,
          usedQuantity: 0,
          totalQuantity: 3,
          isRedeemable: true,
        },
      ],
    });

    const noExpirySub = mapSubscriptionKeys({
      _id: "sub_fifo_open",
      subscriptionCode: "SUB-OPEN",
      customerId: "cust_fifo",
      status: "active",
      entitlements: [
        {
          serviceId: "srv_haircut",
          remainingQuantity: 5,
          usedQuantity: 0,
          totalQuantity: 5,
          isRedeemable: true,
        },
      ],
    });

    const candidates = getEligibleSubscriptionsForCustomer([lateSub, noExpirySub, earlySub], "cust_fifo").get("srv_haircut");

    expect(candidates).toBeDefined();
    expect(candidates).toHaveLength(3);
    // Prioritized strictly by earliest expiration date (FIFO)
    expect(candidates?.[0].subscriptionId).toBe("sub_fifo_early");
    expect(candidates?.[1].subscriptionId).toBe("sub_fifo_late");
    expect(candidates?.[2].subscriptionId).toBe("sub_fifo_open");
  });
});
