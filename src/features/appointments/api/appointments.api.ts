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
  AppointmentListResponse,
  AppointmentDetailsResponse,
  AppointmentMutateResponse,
} from "../types/appointment.types";

const mapAppointmentKeys = (
  appt: Omit<Appointment, "id"> & { _id?: string; id?: string }
): Appointment => ({
  ...appt,
  id: appt._id || appt.id || "",
} as Appointment);

export const getAppointments = async (
  params: AppointmentListQuery = {}
): Promise<PaginatedResponse<Appointment>> => {
  const { data } = await apiClient.get<AppointmentListResponse>("/appointments", {
    params,
    branchScope: "current",
  });

  return {
    ...data,
    data: (data.data || []).map(mapAppointmentKeys),
  };
};

export const getAppointment = async (id: string): Promise<Appointment> => {
  const { data } = await apiClient.get<AppointmentDetailsResponse>(`/appointments/${id}`, {
    branchScope: "current",
  });
  return mapAppointmentKeys(data.data);
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
  return mapAppointmentKeys(data.data);
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
  return mapAppointmentKeys(data.data);
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
  return mapAppointmentKeys(data.data);
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
  return mapAppointmentKeys(data.data);
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
  return mapAppointmentKeys(data.data);
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
