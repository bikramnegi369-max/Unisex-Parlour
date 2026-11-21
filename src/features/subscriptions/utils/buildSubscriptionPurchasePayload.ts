import type {
  CreateSubscriptionPayload,
  SubscriptionMemberPayload,
  MemberEntitlementPayload,
} from "../types/subscription.types";
import type { CreateSubscriptionFormValues } from "../schemas/subscription.schema";

export interface BuildSubscriptionPurchasePayloadOptions {
  values: CreateSubscriptionFormValues;
  effectiveBranchId?: string | null;
  defaultCustomerId?: string | null;
}

/**
 * Canonical Subscription Purchase Payload Builder
 * 
 * Generates the authoritative backend request payload contract for:
 * 1. Subscription List & Catalog Page dialog
 * 2. Create Appointment modal upsell dialog
 * 3. Appointment Details modal upsell dialog
 * 
 * Enforces:
 * - Multi-member and single-member canonical structures
 * - Branch ID validation (filters out 'all' sentinels)
 * - Payer ID and member mapping
 * - Staff attribution retention
 */
export function buildSubscriptionPurchasePayload({
  values,
  effectiveBranchId,
  defaultCustomerId,
}: BuildSubscriptionPurchasePayloadOptions): CreateSubscriptionPayload {
  const payerId = values.payerCustomerId || values.customerId || defaultCustomerId || "";
  const sanitizedBranchId =
    values.branchId && values.branchId !== "all"
      ? values.branchId
      : effectiveBranchId && effectiveBranchId !== "all"
        ? effectiveBranchId
        : undefined;

  const sanitizedPermittedBranchIds = (values.permittedBranchIds || []).filter(
    (bId) => Boolean(bId) && bId !== "all" && bId.trim() !== "",
  );

  const isMultiMember = Array.isArray(values.members) && values.members.length > 0;

  if (isMultiMember) {
    const canonicalMembers: SubscriptionMemberPayload[] = (values.members || []).map(
      (m) => {
        const memPermitted = (m.permittedBranchIds || []).filter(
          (bId) => Boolean(bId) && bId !== "all" && bId.trim() !== "",
        );
        const memEntitlements: MemberEntitlementPayload[] = (m.entitlements || []).map(
          (e) => ({
            serviceId: e.serviceId,
            quantity: Math.max(1, Number(e.quantity) || 1),
          }),
        );

        return {
          customerId: m.customerId,
          permittedBranchIds: memPermitted,
          notes: m.notes?.trim() || undefined,
          entitlements: memEntitlements,
        };
      },
    );

    return {
      payerCustomerId: payerId,
      customerId: payerId,
      branchId: sanitizedBranchId,
      soldByStaffId: values.soldByStaffId || undefined,
      planId: values.planId?.trim() ? values.planId.trim() : undefined,
      price: Number(values.price),
      members: canonicalMembers,
      permittedBranchIds: sanitizedPermittedBranchIds,
      startDate: values.startDate,
      endDate: values.endDate,
      notes: values.notes?.trim() || undefined,
    };
  }

  // Canonical single-member payload
  const singleEntitlements: MemberEntitlementPayload[] = (values.entitlements || []).map(
    (e) => ({
      serviceId: e.serviceId,
      quantity: Math.max(1, Number(e.quantity) || 1),
    }),
  );

  const singleMember: SubscriptionMemberPayload = {
    customerId: payerId,
    permittedBranchIds: sanitizedPermittedBranchIds,
    notes: values.notes?.trim() || undefined,
    entitlements: singleEntitlements,
  };

  return {
    payerCustomerId: payerId,
    customerId: payerId,
    branchId: sanitizedBranchId,
    soldByStaffId: values.soldByStaffId || undefined,
    planId: values.planId?.trim() ? values.planId.trim() : undefined,
    price: Number(values.price),
    members: [singleMember],
    entitlements: singleEntitlements,
    permittedBranchIds: sanitizedPermittedBranchIds,
    startDate: values.startDate,
    endDate: values.endDate,
    notes: values.notes?.trim() || undefined,
  };
}
