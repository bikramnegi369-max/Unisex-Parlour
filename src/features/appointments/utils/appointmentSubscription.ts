import type { Appointment, AppointmentServiceSnapshot } from "../types/appointment.types";

/**
 * Determines whether an appointment requires subscription OTP verification.
 * Per business rules:
 * - Requires OTP only when at least one service has `appliedSubscriptionId` AND `isRedeemedViaSubscription !== true`.
 * - If all subscription services have already been redeemed, no OTP is needed.
 * - If no services are backed by a subscription, standard status update applies.
 */
export function requiresSubscriptionVerification(
  appointment: Appointment | null | undefined
): boolean {
  if (!appointment || !appointment.services || appointment.services.length === 0) {
    return false;
  }

  return appointment.services.some(
    (s: AppointmentServiceSnapshot) =>
      Boolean(s.appliedSubscriptionId) && !s.isRedeemedViaSubscription
  );
}

/**
 * Returns the list of unredeemed subscription services for an appointment.
 */
export function getUnredeemedSubscriptionServices(
  appointment: Appointment | null | undefined
): AppointmentServiceSnapshot[] {
  if (!appointment || !appointment.services) return [];
  return appointment.services.filter(
    (s: AppointmentServiceSnapshot) =>
      Boolean(s.appliedSubscriptionId) && !s.isRedeemedViaSubscription
  );
}
