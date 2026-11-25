"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import {
  createHoliday,
  createLeavePolicy,
  deactivateLeavePolicy,
  deleteHoliday,
  getBackupStatus,
  getBranchSettings,
  getEffectiveSettings,
  getOrganizationSettings,
  listExports,
  listHolidays,
  listLeavePolicies,
  requestExport,
  updateBranchSettings,
  updateOrganizationSettings,
} from "../api/settings.api";
import type { ExportDomain, ExportFormat } from "../types/settings.types";
import type {
  CreateHolidayFormValues,
  CreateLeavePolicyFormValues,
} from "../schemas/settings.schema";

export function useOrganizationSettings(enabled = true) {
  return useQuery({
    queryKey: getScopeQueryKey("settings-organization", null),
    queryFn: getOrganizationSettings,
    enabled,
  });
}

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateOrganizationSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-organization"] });
      queryClient.invalidateQueries({ queryKey: ["settings-effective"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useBranchSettings(branchId: string | null, enabled = true) {
  return useQuery({
    queryKey: getScopeQueryKey("settings-branch", branchId),
    queryFn: () => getBranchSettings(branchId!),
    enabled: enabled && Boolean(branchId),
  });
}

export function useUpdateBranchSettings(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateBranchSettings(branchId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-branch"] });
      queryClient.invalidateQueries({ queryKey: ["settings-effective"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useEffectiveSettings(branchId: string | null, enabled = true) {
  return useQuery({
    queryKey: getScopeQueryKey("settings-effective", branchId),
    queryFn: () => getEffectiveSettings(branchId),
    enabled,
  });
}

export function useHolidays(branchId: string | null, enabled = true) {
  return useQuery({
    queryKey: getScopeQueryKey("settings-holidays", branchId),
    queryFn: () => listHolidays(branchId),
    enabled,
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateHolidayFormValues) => createHoliday(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-holidays"] });
      queryClient.invalidateQueries({ queryKey: ["settings-effective"] });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-holidays"] });
      queryClient.invalidateQueries({ queryKey: ["settings-effective"] });
    },
  });
}

export function useLeavePolicies(branchId: string | null, enabled = true) {
  return useQuery({
    queryKey: getScopeQueryKey("settings-leave-policies", branchId),
    queryFn: () => listLeavePolicies(branchId),
    enabled,
  });
}

export function useCreateLeavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeavePolicyFormValues) => createLeavePolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-leave-policies"] });
    },
  });
}

export function useDeactivateLeavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateLeavePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-leave-policies"] });
    },
  });
}

export function useExports() {
  return useQuery({
    queryKey: ["settings-exports"],
    queryFn: listExports,
  });
}

export function useRequestExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      domain: ExportDomain;
      format: ExportFormat;
      idempotencyKey?: string;
    }) => requestExport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-exports"] });
    },
  });
}

export function useBackupStatus() {
  return useQuery({
    queryKey: ["settings-backups-status"],
    queryFn: getBackupStatus,
  });
}
