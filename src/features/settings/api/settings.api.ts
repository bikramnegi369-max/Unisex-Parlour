import { apiClient } from "@/lib/api/axios";
import type {
  BackupStatusDTO,
  BranchSettingsDTO,
  EffectiveSettingsDTO,
  ExportDomain,
  ExportFormat,
  ExportJobDTO,
  HolidayCalendarDTO,
  HolidayMutationResult,
  LeavePolicyDTO,
  OrganizationSettingsDTO,
} from "../types/settings.types";
import type {
  CreateHolidayFormValues,
  CreateLeavePolicyFormValues,
} from "../schemas/settings.schema";

interface ApiEnvelope<T> {
  success: boolean;
  status: string;
  message: string;
  data: T;
}

export async function getOrganizationSettings(): Promise<OrganizationSettingsDTO> {
  const { data } = await apiClient.get<ApiEnvelope<OrganizationSettingsDTO>>(
    "/settings/organization",
    { branchScope: "organization" },
  );
  return data.data;
}

export async function updateOrganizationSettings(
  payload: Record<string, unknown>,
): Promise<OrganizationSettingsDTO> {
  const { data } = await apiClient.put<ApiEnvelope<OrganizationSettingsDTO>>(
    "/settings/organization",
    payload,
    { branchScope: "organization" },
  );
  return data.data;
}

export async function getBranchSettings(
  branchId: string,
): Promise<BranchSettingsDTO> {
  const { data } = await apiClient.get<ApiEnvelope<BranchSettingsDTO>>(
    `/settings/branches/${branchId}`,
    { branchScope: { type: "branch", branchId } },
  );
  return data.data;
}

export async function updateBranchSettings(
  branchId: string,
  payload: Record<string, unknown>,
): Promise<BranchSettingsDTO> {
  const { data } = await apiClient.put<ApiEnvelope<BranchSettingsDTO>>(
    `/settings/branches/${branchId}`,
    payload,
    { branchScope: { type: "branch", branchId } },
  );
  return data.data;
}

export async function getEffectiveSettings(
  branchId: string | null,
): Promise<EffectiveSettingsDTO> {
  const { data } = await apiClient.get<ApiEnvelope<EffectiveSettingsDTO>>(
    "/settings/effective",
    branchId
      ? { branchScope: { type: "branch", branchId } }
      : { branchScope: "organization" },
  );
  return data.data;
}

export async function listHolidays(
  branchId: string | null,
): Promise<HolidayCalendarDTO[]> {
  const params = branchId ? { branchId } : undefined;
  const { data } = await apiClient.get<ApiEnvelope<HolidayCalendarDTO[]>>(
    "/settings/holidays",
    { params, branchScope: "organization" },
  );
  return data.data;
}

export async function createHoliday(
  payload: CreateHolidayFormValues,
): Promise<HolidayMutationResult> {
  const { data } = await apiClient.post<ApiEnvelope<HolidayMutationResult>>(
    "/settings/holidays",
    payload,
    { branchScope: "organization" },
  );
  return data.data;
}

export async function deleteHoliday(id: string): Promise<HolidayCalendarDTO> {
  const { data } = await apiClient.delete<ApiEnvelope<HolidayCalendarDTO>>(
    `/settings/holidays/${id}`,
    { branchScope: "organization" },
  );
  return data.data;
}

export async function listLeavePolicies(
  branchId: string | null,
): Promise<LeavePolicyDTO[]> {
  const params = branchId ? { branchId } : undefined;
  const { data } = await apiClient.get<ApiEnvelope<LeavePolicyDTO[]>>(
    "/settings/leave-policies",
    { params, branchScope: "organization" },
  );
  return data.data;
}

export async function createLeavePolicy(
  payload: CreateLeavePolicyFormValues,
): Promise<LeavePolicyDTO> {
  const { data } = await apiClient.post<ApiEnvelope<LeavePolicyDTO>>(
    "/settings/leave-policies",
    payload,
    { branchScope: "organization" },
  );
  return data.data;
}

export async function deactivateLeavePolicy(
  id: string,
): Promise<LeavePolicyDTO> {
  const { data } = await apiClient.delete<ApiEnvelope<LeavePolicyDTO>>(
    `/settings/leave-policies/${id}`,
    { branchScope: "organization" },
  );
  return data.data;
}

export async function listExports(): Promise<ExportJobDTO[]> {
  const { data } = await apiClient.get<ApiEnvelope<ExportJobDTO[]>>(
    "/settings/exports",
    { branchScope: "current" },
  );
  return data.data;
}

export async function requestExport(payload: {
  domain: ExportDomain;
  format: ExportFormat;
  idempotencyKey?: string;
}): Promise<ExportJobDTO> {
  const { data } = await apiClient.post<ApiEnvelope<ExportJobDTO>>(
    "/settings/exports",
    payload,
    { branchScope: "current" },
  );
  return data.data;
}

export async function downloadExport(exportId: string) {
  return apiClient.get<Blob>(`/settings/exports/${exportId}/download`, {
    responseType: "blob",
    branchScope: "current",
  });
}

export async function getBackupStatus(): Promise<BackupStatusDTO> {
  const { data } = await apiClient.get<ApiEnvelope<BackupStatusDTO>>(
    "/settings/backups/status",
    { branchScope: "organization" },
  );
  return data.data;
}
