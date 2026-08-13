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
  AppointmentListResponse,
  AppointmentDetailsResponse,
  AppointmentMutateResponse,
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

interface PopulatedRef {
  _id: string;
  name: string;
  [key: string]: unknown;
}

const isPopulatedRef = (value: unknown): value is PopulatedRef =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as PopulatedRef)._id === "string";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normalizeAppointment = (raw: Record<string, any>): Appointment => {
  // 1. ID normalization (_id → id)
  const id: string = raw._id || raw.id || "";

  // 2. Date field normalization (appointmentDate → date)
  const date: string = raw.appointmentDate || raw.date || "";

  // 3. Time field normalization (startTime canonical, timeSlot fallback)
  const startTime: string = raw.startTime || raw.timeSlot || "";

  // 4. Populated customerId → flat string + customer summary
  let customerId: string;
  let customer: CustomerSummary | undefined;
  if (isPopulatedRef(raw.customerId)) {
    customerId = raw.customerId._id;
    customer = {
      id: raw.customerId._id,
      name: raw.customerId.name,
      phone: (raw.customerId.phone as string) || "",
      email: raw.customerId.email as string | undefined,
    };
  } else {
    customerId = (raw.customerId as string) || "";
    customer = raw.customer as CustomerSummary | undefined;
  }

  // 5. Populated staffId → flat string + staff summary
  let staffId: string | null | undefined;
  let staff: StaffSummary | null | undefined;
  if (isPopulatedRef(raw.staffId)) {
    staffId = raw.staffId._id;
    staff = {
      id: raw.staffId._id,
      name: raw.staffId.name,
      role: raw.staffId.role as string | undefined,
    };
  } else if (raw.staffId === null || raw.staffId === undefined) {
    staffId = null;
    staff = null;
  } else {
    staffId = raw.staffId as string;
    staff = (raw.staff as StaffSummary | null) ?? null;
  }

  // 6. Services normalization (serviceName → name)
  const rawServices: Record<string, unknown>[] = Array.isArray(raw.services)
    ? raw.services
    : [];
  const services: AppointmentServiceSnapshot[] = rawServices.map((s) => ({
    serviceId: (s.serviceId as string) || (s._id as string) || "",
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
  let branchId: string;
  let branch: BranchSummary | undefined;
  if (isPopulatedRef(raw.branchId)) {
    branchId = raw.branchId._id;
    branch = {
      id: raw.branchId._id,
      name: raw.branchId.name,
      timezone: raw.branchId.timezone as string | undefined,
    };
  } else {
    branchId = (raw.branchId as string) || "";
    branch = raw.branch as BranchSummary | undefined;
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
  const { data } = await apiClient.get<AppointmentListResponse>("/appointments", {
    params,
    branchScope: "current",
  });

  return {
    ...data,
    data: (data.data || []).map(normalizeAppointment),
  };
};

export const getAppointment = async (id: string): Promise<Appointment> => {
  const { data } = await apiClient.get<AppointmentDetailsResponse>(`/appointments/${id}`, {
    branchScope: "current",
  });
  return normalizeAppointment(data.data);
};

export const createAppointment = async (
  payload: CreateAppointmentPayload
): Promise<Appointment> => {
  const { data } = await apiClient.post<AppointmentMutateResponse>(
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
  const { data } = await apiClient.patch<AppointmentMutateResponse>(
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
  const { data } = await apiClient.patch<AppointmentMutateResponse>(
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
  const { data } = await apiClient.patch<AppointmentMutateResponse>(
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
  const { data } = await apiClient.patch<AppointmentMutateResponse>(
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
  const { data } = await apiClient.post<AppointmentMutateResponse>(
    `/appointments/${id}/reminder/trigger`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return normalizeAppointment(data.data);
};
