import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment,
  updateAppointmentMetadata,
  rescheduleAppointment,
  assignAppointmentStaff,
  updateAppointmentStatus,
  deleteAppointment,
  triggerAppointmentReminder,
  requestConsumptionOtp,
  completeWithSubscription,
} from "../api/appointments.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import type {
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  RescheduleAppointmentPayload,
  AssignStaffPayload,
  UpdateAppointmentStatusPayload,
  TriggerReminderPayload,
  RequestConsumptionOtpPayload,
  CompleteWithSubscriptionPayload,
} from "../types/appointment.types";

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) => createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "appointments",
      });
      broadcastCrossTabInvalidation("appointments");
    },
  });
}

export function useUpdateAppointmentMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppointmentPayload }) =>
      updateAppointmentMetadata(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === "appointments" || key === "appointment";
        },
      });
      broadcastCrossTabInvalidation("appointments");
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RescheduleAppointmentPayload }) =>
      rescheduleAppointment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === "appointments" || key === "appointment";
        },
      });
      broadcastCrossTabInvalidation("appointments");
    },
  });
}

export function useAssignAppointmentStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignStaffPayload }) =>
      assignAppointmentStaff(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === "appointments" || key === "appointment";
        },
      });
      broadcastCrossTabInvalidation("appointments");
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppointmentStatusPayload }) =>
      updateAppointmentStatus(id, payload),
    onSuccess: () => {
      // Invalidate all appointment query variations across scopes so POS queue and calendar update immediately
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === "appointments" || key === "appointment";
        },
      });
      // Broadcast to all other open tabs (e.g. Billing/POS queue tab)
      broadcastCrossTabInvalidation("appointments");
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, branchId }: { id: string; branchId: string }) =>
      deleteAppointment(id, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === "appointments" || key === "appointment";
        },
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

export function useRequestConsumptionOtp() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RequestConsumptionOtpPayload }) =>
      requestConsumptionOtp(id, payload),
  });
}

export function useCompleteWithSubscription() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CompleteWithSubscriptionPayload }) =>
      completeWithSubscription(id, payload),
    onSuccess: (data) => {
      // Invalidate appointment queries
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("appointments") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("appointment", [data.id]),
      });
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("appointments", null) });
      queryClient.invalidateQueries({
        queryKey: getScopeQueryKey("appointment", null, [data.id]),
      });

      // Targeted subscription queries invalidation for affected customer entitlements
      if (data.customerId) {
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", "customer", data.customerId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "list"],
      });

      // If any service had appliedSubscriptionId, invalidate its detail & usage
      const subIds = new Set<string>();
      (data.services || []).forEach((srv) => {
        if (srv.appliedSubscriptionId) {
          subIds.add(srv.appliedSubscriptionId);
        }
      });
      subIds.forEach((subId) => {
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", "detail", subId],
        });
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", "usage", subId],
        });
      });
    },
  });
}

