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

  // 6. Services normalization (serviceName → name)
  const rawServices: Record<string, unknown>[] = Array.isArray(raw.services)
    ? raw.services
    : [];
  const services: AppointmentServiceSnapshot[] = rawServices.map((s) => ({
    serviceId: toFlatId(s.serviceId || s._id || s.id),
    name: (s.name as string) || (s.serviceName as string) || "",
    duration: (s.duration as number) || 0,
    price: (s.price as number) || 0,
    taxRate: s.taxRate as number | undefined,
    taxAmount: s.taxAmount as number | undefined,
    category: s.category as string | undefined,
  }));

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
        : services.map((s) => s.serviceId),
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

export const getAppointment = async (id: string): Promise<Appointment> => {
  const { data } = await apiClient.get<{ success: boolean; data: Record<string, unknown> }>(`/appointments/${id}`, {
    branchScope: "current",
  });
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
  const { data } = await apiClient.patch<{ success: boolean; data: Record<string, unknown> }>(
    `/appointments/${id}/status`,
    payload,
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
