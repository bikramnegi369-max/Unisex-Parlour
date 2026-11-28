import type {
  Appointment,
  AppointmentServiceSnapshot,
} from "../types/appointment.types";

export interface AppointmentFinancialBreakdown {
  grossSubtotal: number;
  subscriptionWaivedAmount: number;
  membershipDiscountAmount: number;
  manualDiscountAmount: number;
  netPayable: number;
  membershipCodes: string[];
}

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isServiceSubscriptionCovered(
  service?: Partial<AppointmentServiceSnapshot> | null,
): boolean {
  if (!service) return false;
  return Boolean(
    service.isRedeemedViaSubscription ||
      service.subscriptionUsageId ||
      service.appliedSubscriptionId,
  );
}

export function resolveServiceSubscriptionCode(
  service?: Partial<AppointmentServiceSnapshot> | null,
): string | null {
  if (!service) return null;
  if (service.subscriptionCode) return service.subscriptionCode;
  if (
    service.appliedSubscriptionId &&
    typeof service.appliedSubscriptionId === "object" &&
    "subscriptionCode" in service.appliedSubscriptionId
  ) {
    return (
      (service.appliedSubscriptionId as { subscriptionCode?: string | null })
        .subscriptionCode ?? null
    );
  }
  return null;
}

export function resolveServiceMembershipCode(
  service?: Partial<AppointmentServiceSnapshot> | null,
): string | null {
  if (!service) return null;
  if (service.membershipCode) return service.membershipCode;
  if (
    service.appliedCustomerMembershipId &&
    typeof service.appliedCustomerMembershipId === "object" &&
    "membershipCode" in service.appliedCustomerMembershipId
  ) {
    return (
      (
        service.appliedCustomerMembershipId as {
          membershipCode?: string | null;
        }
      ).membershipCode ?? null
    );
  }
  return null;
}

export function computeAppointmentFinancialBreakdown(
  appointment?: Partial<Appointment> | null,
): AppointmentFinancialBreakdown {
  if (!appointment) {
    return {
      grossSubtotal: 0,
      subscriptionWaivedAmount: 0,
      membershipDiscountAmount: 0,
      manualDiscountAmount: 0,
      netPayable: 0,
      membershipCodes: [],
    };
  }

  const services = appointment.services || [];
  let computedGross = 0;
  let computedSubWaived = 0;
  let computedMembershipDiscount = 0;
  const membershipCodeSet = new Set<string>();

  for (const svc of services) {
    const price = round2(Math.max(0, Number(svc?.price) || 0));
    computedGross = round2(computedGross + price);

    if (isServiceSubscriptionCovered(svc)) {
      computedSubWaived = round2(computedSubWaived + price);
    } else {
      const memDisc = round2(
        Math.min(price, Math.max(0, Number(svc?.membershipDiscountAmount) || 0)),
      );
      computedMembershipDiscount = round2(computedMembershipDiscount + memDisc);
      const code = resolveServiceMembershipCode(svc);
      if (code) membershipCodeSet.add(code);
    }
  }

  const pricing = appointment.pricing as
    | (Appointment["pricing"] & {
        grossSubtotal?: number;
        subscriptionWaivedAmount?: number;
        membershipDiscountAmount?: number;
        manualDiscountAmount?: number;
        totalPayable?: number;
      })
    | undefined;

  const grossSubtotal =
    pricing?.grossSubtotal !== undefined
      ? round2(pricing.grossSubtotal)
      : services.length > 0
        ? computedGross
        : round2(pricing?.subtotal ?? 0);

  const subscriptionWaivedAmount =
    pricing?.subscriptionWaivedAmount !== undefined
      ? round2(pricing.subscriptionWaivedAmount)
      : computedSubWaived;

  const membershipDiscountAmount =
    pricing?.membershipDiscountAmount !== undefined
      ? round2(pricing.membershipDiscountAmount)
      : computedMembershipDiscount;

  const manualDiscountAmount =
    pricing?.manualDiscountAmount !== undefined
      ? round2(Math.max(0, pricing.manualDiscountAmount))
      : pricing?.discount !== undefined
        ? round2(Math.max(0, pricing.discount - membershipDiscountAmount))
        : 0;

  const netPayable = round2(
    Math.max(
      0,
      grossSubtotal -
        subscriptionWaivedAmount -
        membershipDiscountAmount -
        manualDiscountAmount,
    ),
  );

  return {
    grossSubtotal,
    subscriptionWaivedAmount,
    membershipDiscountAmount,
    manualDiscountAmount,
    netPayable,
    membershipCodes: Array.from(membershipCodeSet),
  };
}
