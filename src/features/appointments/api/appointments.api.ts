import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  Appointment,
  AppointmentListQuery,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  RescheduleAppointmentPayload,
  AssignStaffPayload,
  UpdateAppointmentStatusPayload,
  TriggerReminderPayload,
  AppointmentServiceSnapshot,
  AppointmentReminder,
  AppointmentPricing,
  AppointmentCancellation,
  AppointmentStatus,
  BookingType,
  CustomerSummary,
  StaffSummary,
  BranchSummary,
  RequestConsumptionOtpPayload,
  RequestConsumptionOtpResponse,
  CompleteWithSubscriptionPayload,
} from "../types/appointment.types";

// ---------------------------------------------------------------------------
// Backend Response Normalizer
// ---------------------------------------------------------------------------
// The backend returns populated objects for staffId/customerId, uses
// `appointmentDate` instead of `date`, `timeSlot` instead of `startTime`,
// `serviceName` instead of `name`, and a structured `cancellation` object.
//
// This normalizer translates ALL backend-shape variations into the clean
// `Appointment` type that every UI component expects. This is the ONLY place
// in the frontend where backend-shape awareness lives.
// ---------------------------------------------------------------------------

const toFlatId = (val: unknown): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if (typeof obj._id === "string") return obj._id;
    if (typeof obj.id === "string") return obj.id;
    return String(obj._id || obj.id || "");
  }
  return String(val);
};

export const normalizeAppointment = (raw: Record<string, unknown>): Appointment => {
  // 1. ID normalization (_id → id)
  const id: string = toFlatId(raw._id || raw.id);

  // 2. Date field normalization (appointmentDate → date)
  const date: string = (raw.appointmentDate as string) || (raw.date as string) || "";

  // 3. Time field normalization (startTime canonical, timeSlot fallback)
  const startTime: string = (raw.startTime as string) || (raw.timeSlot as string) || "";

  // 4. Populated customerId → flat string + customer summary
  const customerId: string = toFlatId(raw.customerId);
  let customer: CustomerSummary | undefined;
  if (typeof raw.customerId === "object" && raw.customerId !== null) {
    const obj = raw.customerId as Record<string, unknown>;
    customer = {
      id: customerId,
      name: typeof obj.name === "string" ? obj.name : "Customer",
      phone: typeof obj.phone === "string" ? obj.phone : "",
      email: typeof obj.email === "string" ? obj.email : undefined,
    };
  } else if (typeof raw.customer === "object" && raw.customer !== null) {
    customer = raw.customer as CustomerSummary;
  }

  // 5. Populated staffId → flat string + staff summary
  let staffId: string | null | undefined;
  let staff: StaffSummary | null | undefined;
  if (raw.staffId === null || raw.staffId === undefined) {
    staffId = null;
    staff = null;
  } else {
    staffId = toFlatId(raw.staffId) || null;
    if (typeof raw.staffId === "object" && raw.staffId !== null) {
      const obj = raw.staffId as Record<string, unknown>;
      staff = {
        id: staffId || "",
        name: typeof obj.name === "string" ? obj.name : "Staff",
        role: typeof obj.role === "string" ? obj.role : undefined,
      };
    } else {
      staff = (raw.staff as StaffSummary | null) ?? null;
    }
  }

  // 6. Services normalization (serviceName → name, preserve custom service attributes)
  const rawServices: Record<string, unknown>[] = Array.isArray(raw.services)
    ? raw.services
    : [];
  const services: AppointmentServiceSnapshot[] = rawServices.map((s) => {
    const isCustomExplicit = Boolean(s.isCustom || s.serviceType === "custom");
    // If it has an explicit serviceId, check it. If empty or null or marked custom, serviceId is null/undefined.
    const rawServiceId = s.serviceId || (isCustomExplicit ? null : s._id || s.id);
    const flattenedServiceId = rawServiceId ? toFlatId(rawServiceId) : null;
    const isCustom = isCustomExplicit || !flattenedServiceId;

    const rawSub = s.appliedSubscriptionId;
    let extractedSubCode: string | null = null;
    let extractedSubId: string | null = null;

    if (rawSub && typeof rawSub === "object") {
      const subObj = rawSub as Record<string, unknown>;
      extractedSubId = toFlatId(subObj._id || subObj.id);
      if (typeof subObj.subscriptionCode === "string") {
        extractedSubCode = subObj.subscriptionCode;
      }
    } else if (rawSub) {
      extractedSubId = toFlatId(rawSub);
    }

    if (!extractedSubCode && typeof s.subscriptionCode === "string") {
      extractedSubCode = s.subscriptionCode;
    }

    const rawMem = s.appliedCustomerMembershipId;
    let extractedMemId: string | null = null;
    let extractedMemCode: string | null = null;

    if (rawMem && typeof rawMem === "object") {
      const memObj = rawMem as Record<string, unknown>;
      extractedMemId = toFlatId(memObj._id || memObj.id) || null;
      if (typeof memObj.membershipCode === "string") {
        extractedMemCode = memObj.membershipCode;
      }
    } else if (rawMem) {
      extractedMemId = toFlatId(rawMem) || null;
    }

    if (!extractedMemCode && typeof s.membershipCode === "string") {
      extractedMemCode = s.membershipCode;
    }

    return {
      serviceId: flattenedServiceId || null,
      name: (s.name as string) || (s.serviceName as string) || (isCustom ? "Custom Service" : ""),
      duration: (s.duration as number) || 0,
      price: (s.price as number) || 0,
      category: s.category as string | undefined,
      isCustom,
      serviceType: isCustom ? "custom" : "registered",
      _id: s._id ? String(s._id) : undefined,
      id: s.id ? String(s.id) : undefined,
      appliedSubscriptionId: isCustom
        ? null
        : extractedSubId || null,
      subscriptionCode: isCustom ? null : extractedSubCode,
      subscriptionPlanName: isCustom ? null : typeof s.subscriptionPlanName === "string" ? s.subscriptionPlanName : null,
      isRedeemedViaSubscription: isCustom ? false : Boolean(s.isRedeemedViaSubscription),
      subscriptionUsageId: isCustom
        ? null
        : (s.subscriptionUsageId as string) ||
          (toFlatId(s.subscriptionUsageId) ? toFlatId(s.subscriptionUsageId) : null) ||
          null,
      appliedCustomerMembershipId: extractedMemId,
      membershipCode: extractedMemCode,
      membershipDiscountAmount:
        typeof s.membershipDiscountAmount === "number"
          ? s.membershipDiscountAmount
          : 0,
      membershipDiscountPercentage:
        typeof s.membershipDiscountPercentage === "number"
          ? s.membershipDiscountPercentage
          : 0,
    };
  });

  // 7. Cancellation normalization (object → flat reason + structured object)
  const cancellationObj = raw.cancellation as AppointmentCancellation | undefined;
  const cancellationReason =
    cancellationObj?.reason || (raw.cancellationReason as string) || undefined;
  const cancelledAt =
    cancellationObj?.cancelledAt || (raw.cancelledAt as string) || undefined;

  // 8. Branch normalization (branchId may be populated or string)
  const branchId: string = toFlatId(raw.branchId);
  let branch: BranchSummary | undefined;
  if (typeof raw.branchId === "object" && raw.branchId !== null) {
    const obj = raw.branchId as Record<string, unknown>;
    branch = {
      id: branchId,
      name: typeof obj.name === "string" ? obj.name : "Branch",
      timezone: typeof obj.timezone === "string" ? obj.timezone : undefined,
    };
  } else if (typeof raw.branch === "object" && raw.branch !== null) {
    branch = raw.branch as BranchSummary;
  }

  return {
    id,
    appointmentCode: (raw.appointmentCode as string) || undefined,
    organizationId: (raw.organizationId as string) || "",
    branchId,
    customerId,
    customer,
    serviceIds:
      Array.isArray(raw.serviceIds) && raw.serviceIds.length > 0
        ? raw.serviceIds
        : (services.map((s) => s.serviceId).filter(Boolean) as string[]),
    services,
    staffId,
    staff,
    branch,
    bookingType: (raw.bookingType as BookingType) || "advance",
    status: (raw.status as AppointmentStatus) || "scheduled",
    date,
    startTime,
    endTime: (raw.endTime as string) || undefined,
    totalDuration: (raw.totalDuration as number) || undefined,
    startAt: (raw.startAt as string) || undefined,
    endAt: (raw.endAt as string) || undefined,
    notes: (raw.notes as string) || undefined,
    cancellationReason,
    cancellation: cancellationObj,
    completedAt: (raw.completedAt as string) || undefined,
    cancelledAt,
    reminder: raw.reminder as AppointmentReminder | undefined,
    pricing: raw.pricing as AppointmentPricing | undefined,
    createdAt: (raw.createdAt as string) || "",
    updatedAt: (raw.updatedAt as string) || "",
  };
};

export const getAppointments = async (
  params: AppointmentListQuery = {}
): Promise<PaginatedResponse<Appointment>> => {
  const { data } = await apiClient.get<PaginatedResponse<Record<string, unknown>>>("/appointments", {
    params,
    branchScope: "current",
  });

  return {
    ...data,
    data: (data.data || []).map(normalizeAppointment),
  };
};

export const getAppointment = async (
  id: string,
  branchId?: string
): Promise<Appointment> => {
  const { data } = await apiClient.get<{ success: boolean; data: Record<string, unknown> }>(
    `/appointments/${id}`,
    {
      branchScope: branchId ? { type: "branch", branchId } : "current",
    }
  );
  return normalizeAppointment(data.data);
};

export const createAppointment = async (
  payload: CreateAppointmentPayload
): Promise<Appointment> => {
  const { data } = await apiClient.post<{ success: boolean; data: Record<string, unknown> }>(
    "/appointments",
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return normalizeAppointment(data.data);
};

export const updateAppointmentMetadata = async (
  id: string,
  payload: UpdateAppointmentPayload
): Promise<Appointment> => {
  const { data } = await apiClient.patch<{ success: boolean; data: Record<string, unknown> }>(
    `/appointments/${id}`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return normalizeAppointment(data.data);
};

export const rescheduleAppointment = async (
  id: string,
  payload: RescheduleAppointmentPayload
): Promise<Appointment> => {
  const { data } = await apiClient.patch<{ success: boolean; data: Record<string, unknown> }>(
    `/appointments/${id}/reschedule`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return normalizeAppointment(data.data);
};

export const assignAppointmentStaff = async (
  id: string,
  payload: AssignStaffPayload
): Promise<Appointment> => {
  const { data } = await apiClient.patch<{ success: boolean; data: Record<string, unknown> }>(
    `/appointments/${id}/assign-staff`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return normalizeAppointment(data.data);
};

export const updateAppointmentStatus = async (
  id: string,
  payload: UpdateAppointmentStatusPayload
): Promise<Appointment> => {
  const requestBody: Record<string, unknown> = {
    branchId: payload.branchId,
    status: payload.status,
  };

  const reason = payload.reason !== undefined ? payload.reason : payload.cancellationReason;
  if (reason !== undefined) {
    requestBody.reason = reason;
  }
  if (payload.cancellationReason !== undefined) {
    requestBody.cancellationReason = payload.cancellationReason;
  }
  if (payload.forceEarlyStart === true) {
    requestBody.forceEarlyStart = true;
  }
  if (payload.allowOverdueStaffOverride === true) {
    requestBody.allowOverdueStaffOverride = true;
  }

  const { data } = await apiClient.patch<{ success: boolean; data: Record<string, unknown> }>(
    `/appointments/${id}/status`,
    requestBody,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return normalizeAppointment(data.data);
};

export const deleteAppointment = async (
  id: string,
  branchId: string
): Promise<{ success: boolean; message?: string }> => {
  const { data } = await apiClient.delete<{ success: boolean; message?: string }>(
    `/appointments/${id}`,
    {
      branchScope: { type: "branch", branchId },
    }
  );
  return data;
};

export const triggerAppointmentReminder = async (
  id: string,
  payload: TriggerReminderPayload
): Promise<Appointment> => {
  if (!payload.branchId || payload.branchId === "all") {
    throw new Error("Target branch ID is required for reminder trigger and cannot be 'all'.");
  }
  const { data } = await apiClient.post<{ success: boolean; data: Record<string, unknown> }>(
    `/appointments/${id}/reminder/trigger`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return normalizeAppointment(data.data);
};

export const requestConsumptionOtp = async (
  id: string,
  payload: RequestConsumptionOtpPayload
): Promise<RequestConsumptionOtpResponse> => {
  if (!payload.branchId || payload.branchId === "all") {
    throw new Error("Authoritative branch ID is required to request consumption OTP.");
  }
  const { data } = await apiClient.post<RequestConsumptionOtpResponse>(
    `/appointments/${id}/request-consumption-otp`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return data;
};

export const completeWithSubscription = async (
  id: string,
  payload: CompleteWithSubscriptionPayload
): Promise<Appointment> => {
  if (!payload.branchId || payload.branchId === "all") {
    throw new Error("Authoritative branch ID is required to complete appointment with subscription.");
  }
  const { data } = await apiClient.post<{ success: boolean; data: Record<string, unknown> }>(
    `/appointments/${id}/complete-with-subscription`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return normalizeAppointment(data.data);
};

export const previewAppointmentServices = async (
  id: string,
  payload: import("../types/appointment.types").ServiceModificationPreviewPayload
): Promise<import("../types/appointment.types").ServiceModificationPreviewData> => {
  if (!payload.branchId || payload.branchId === "all") {
    throw new Error("Authoritative branch ID is required for service modification preview.");
  }
  const { data } = await apiClient.post<{
    success: boolean;
    data: import("../types/appointment.types").ServiceModificationPreviewData;
  }>(
    `/appointments/${id}/services/preview`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return data.data;
};

export const commitAppointmentServices = async (
  id: string,
  payload: import("../types/appointment.types").ServiceModificationCommitPayload
): Promise<import("../types/appointment.types").ServiceModificationCommitResponse> => {
  if (!payload.branchId || payload.branchId === "all") {
    throw new Error("Authoritative branch ID is required for service modification commit.");
  }
  const { data } = await apiClient.post<{
    success: boolean;
    message?: string;
    data: {
      initiatingAppointment?: Record<string, unknown>;
      shiftedAppointments?: Array<{ id?: string; _id?: string }>;
      [key: string]: unknown;
    };
    affectedAppointmentIds?: string[];
    shiftedAppointments?: Array<{ id?: string; _id?: string }>;
  }>(
    `/appointments/${id}/services/commit`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );

  const rawInitiating =
    data.data?.initiatingAppointment ||
    data.data;

  const rawShiftedList: Array<{ id?: string; _id?: string }> =
    (data.data?.shiftedAppointments as Array<{ id?: string; _id?: string }>) ||
    data.shiftedAppointments ||
    [];

  const extractedIdsFromShifted: string[] = rawShiftedList
    .map((item) => (item?.id || item?._id ? String(item.id || item._id) : ""))
    .filter(Boolean);

  const allAffectedIds = Array.from(
    new Set([
      ...(data.affectedAppointmentIds || []),
      ...extractedIdsFromShifted,
    ])
  );

  return {
    success: data.success,
    message: data.message,
    data: normalizeAppointment(rawInitiating),
    affectedAppointmentIds: allAffectedIds,
    shiftedAppointments: rawShiftedList as import("../types/appointment.types").CascadeAffectedAppointment[],
  };
};

/**
 * Upsell subscription package for a given appointment.
 * Dedicated endpoint: POST /api/v1/appointments/:appointmentId/upsell-subscription
 * Returns separate subscription sale invoice and subscription package.
 */
export const upsellAppointmentSubscription = async (
  appointmentId: string,
  payload: import("../types/appointment.types").UpsellSubscriptionPayload
): Promise<import("../types/appointment.types").UpsellSubscriptionResponseData> => {
  const { mapSubscriptionKeys } = await import(
    "@/features/subscriptions/api/subscriptions.api"
  );
  const { normalizeInvoice } = await import(
    "@/features/billing/api/billing.api"
  );

  const sanitizedBranchIds = (payload.permittedBranchIds || []).filter(
    (bId) => bId !== "all" && bId.trim() !== ""
  );

  const config: { branchScope?: { type: "branch"; branchId: string } | "current" | "none" } =
    payload.branchId && payload.branchId !== "all"
      ? { branchScope: { type: "branch", branchId: payload.branchId } }
      : { branchScope: "current" };

  const { data } = await apiClient.post<
    import("../types/appointment.types").UpsellSubscriptionResponse
  >(
    `/appointments/${appointmentId}/upsell-subscription`,
    {
      ...payload,
      permittedBranchIds: sanitizedBranchIds,
    },
    config
  );

  const rawSub = data.data?.subscription as unknown as import("@/features/subscriptions/api/subscriptions.api").RawSubscriptionDTO;
  const mappedSub = rawSub ? mapSubscriptionKeys(rawSub) : (data.data?.subscription as import("@/features/subscriptions/types/subscription.types").Subscription);

  const rawInvoice = data.data?.invoice as Record<string, unknown> | undefined;
  const normalizedInvoice = rawInvoice ? normalizeInvoice(rawInvoice) : undefined;
  const rawSubInvoiceId =
    typeof mappedSub?.invoiceId === "object" && mappedSub?.invoiceId !== null
      ? (mappedSub.invoiceId as { id?: string; _id?: string }).id ||
        (mappedSub.invoiceId as { id?: string; _id?: string })._id
      : mappedSub?.invoiceId;

  const invoiceId =
    (typeof data.data?.invoiceId === "object" && data.data?.invoiceId !== null
      ? (data.data.invoiceId as { id?: string; _id?: string }).id ||
        (data.data.invoiceId as { id?: string; _id?: string })._id
      : data.data?.invoiceId) ||
    normalizedInvoice?.id ||
    rawSubInvoiceId ||
    undefined;

  return {
    subscription: mappedSub,
    invoice: normalizedInvoice,
    invoiceId,
    summary: data.data?.summary,
  };
};

/**
 * Upsell membership plan for a given appointment.
 * Dedicated endpoint: POST /api/v1/appointments/:appointmentId/upsell-membership
 * Returns separate membership sale invoice, created customer memberships, and updated appointment with immediate discount applied.
 */
export const upsellAppointmentMembership = async (
  appointmentId: string,
  payload: import("../types/appointment.types").UpsellMembershipPayload
): Promise<import("../types/appointment.types").UpsellMembershipResponseData> => {
  const { mapCustomerMembershipKeys } = await import(
    "@/features/memberships/api/memberships.api"
  );
  const { normalizeInvoice } = await import(
    "@/features/billing/api/billing.api"
  );

  const config: { branchScope?: { type: "branch"; branchId: string } | "current" | "none" } =
    payload.branchId && payload.branchId !== "all"
      ? { branchScope: { type: "branch", branchId: payload.branchId } }
      : { branchScope: "current" };

  const { data } = await apiClient.post<
    import("../types/appointment.types").UpsellMembershipResponse
  >(
    `/appointments/${appointmentId}/upsell-membership`,
    payload,
    config
  );

  const rawMem = data.data?.customerMembership as unknown as Parameters<typeof mapCustomerMembershipKeys>[0];
  const mappedMem = rawMem ? mapCustomerMembershipKeys(rawMem) : (data.data?.customerMembership as import("@/features/memberships/types/membership.types").CustomerMembership);

  const rawMems = data.data?.customerMemberships as unknown as Array<Parameters<typeof mapCustomerMembershipKeys>[0]>;
  const mappedMems = Array.isArray(rawMems) ? rawMems.map(mapCustomerMembershipKeys) : [];

  const rawInvoice = data.data?.invoice as Record<string, unknown> | undefined;
  const normalizedInvoice = rawInvoice ? normalizeInvoice(rawInvoice) : undefined;
  const memInvoiceId =
    typeof mappedMem?.invoiceId === "string"
      ? mappedMem.invoiceId
      : (mappedMem?.invoiceId as { id?: string; _id?: string } | undefined)?.id ||
        (mappedMem?.invoiceId as { id?: string; _id?: string } | undefined)?._id ||
        undefined;

  const invoiceId =
    (typeof data.data?.invoiceId === "string" ? data.data.invoiceId : undefined) ||
    normalizedInvoice?.id ||
    memInvoiceId ||
    undefined;

  return {
    customerMembership: mappedMem,
    customerMemberships: mappedMems,
    invoice: normalizedInvoice,
    invoiceId,
    appointment: data.data?.appointment,
    summary: data.data?.summary,
  };
};




