import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment,
  updateAppointmentMetadata,
  rescheduleAppointment,
  assignAppointmentStaff,
  updateAppointmentStatus,
  deleteAppointment,
  triggerAppointmentReminder,
} from "../api/appointments.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type {
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  RescheduleAppointmentPayload,
  AssignStaffPayload,
  UpdateAppointmentStatusPayload,
  TriggerReminderPayload,
} from "../types/appointment.types";

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

export function useTriggerAppointmentReminder() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TriggerReminderPayload }) =>
      triggerAppointmentReminder(id, payload),
    onSuccess: (data) => {
      // Invalidate branch-scoped list queries and single appt query
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("appointments") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("appointment", [data.id]),
      });

      // Also invalidate org-wide queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("appointments", null) });
      queryClient.invalidateQueries({
        queryKey: getScopeQueryKey("appointment", null, [data.id]),
      });
    },
  });
}
