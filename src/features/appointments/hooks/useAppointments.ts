import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointmentMetadata,
  rescheduleAppointment,
  assignAppointmentStaff,
  updateAppointmentStatus,
  deleteAppointment,
} from "../api/appointments.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type {
  AppointmentListQuery,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  RescheduleAppointmentPayload,
  AssignStaffPayload,
  UpdateAppointmentStatusPayload,
} from "../types/appointment.types";

export function useAppointments(params: AppointmentListQuery = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "appointments.view");

  const isEnabled = isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("appointments", [params]);

  return useQuery({
    queryKey,
    queryFn: () => getAppointments(params),
    enabled: isEnabled,
  });
}

export function useAppointment(id: string | undefined) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "appointments.view");

  const isEnabled = isAuthenticated && hasViewPermission && !!id && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("appointment", [id || ""]);

  return useQuery({
    queryKey,
    queryFn: () => getAppointment(id!),
    enabled: isEnabled,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) => createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("appointments") });
    },
  });
}

export function useUpdateAppointmentMetadata() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppointmentPayload }) =>
      updateAppointmentMetadata(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("appointments") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("appointment", [data.id]),
      });
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RescheduleAppointmentPayload }) =>
      rescheduleAppointment(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("appointments") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("appointment", [data.id]),
      });
    },
  });
}

export function useAssignAppointmentStaff() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignStaffPayload }) =>
      assignAppointmentStaff(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("appointments") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("appointment", [data.id]),
      });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppointmentStatusPayload }) =>
      updateAppointmentStatus(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("appointments") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("appointment", [data.id]),
      });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, branchId }: { id: string; branchId: string }) =>
      deleteAppointment(id, branchId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("appointments") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("appointment", [variables.id]),
      });
    },
  });
}
