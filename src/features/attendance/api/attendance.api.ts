import { apiClient } from "@/lib/api/axios";

export type AttendanceStatus = "present" | "late" | "early_departure" | "incomplete";
export type AttendanceRegisterStatus = AttendanceStatus | "missing_punch" | "not_started";

export interface AttendanceStaff {
  _id: string;
  name: string;
  staffCode: string;
  email: string;
  designation: string;
}

export interface MonthlyMusterRollMetrics {
  totalDaysInMonth: number;
  eligibleDays: number;
  presentDays: number;
  lateDays: number;
  earlyDepartureDays: number;
  incompleteDays: number;
  approvedPaidLeaveDays: number;
  approvedUnpaidLeaveDays: number;
  absentDays: number;
}

export interface MonthlyMusterRollRow {
  staff: {
    _id: string;
    name: string;
    staffCode: string;
    designation: string;
  };
  metrics: MonthlyMusterRollMetrics;
  dailyBreakdown: Record<string, { status: string; date: string; attendanceId?: string; isReconciled?: boolean; leaveId?: string }>;
}

export interface MonthlyMusterRollResponse {
  monthYear: string;
  branchId: string;
  totalStaff: number;
  dates: string[];
  consolidatedTotals: {
    totalStaff: number;
    presentDays: number;
    lateDays: number;
    earlyDepartureDays: number;
    incompleteDays: number;
    approvedPaidLeaveDays: number;
    approvedUnpaidLeaveDays: number;
    absentDays: number;
    totalWorkingDaysEvaluated: number;
  };
  musterRoll: MonthlyMusterRollRow[];
}

export interface RecordStaffPunchPayload {
  staffId?: string;
  punchType: "in" | "out";
  notes?: string;
}

export interface RecordStaffPunchResponse {
  punch: AttendancePunch;
  attendanceRecord: AttendanceRecord | null;
  attendanceDate: string;
  status: AttendanceStatus;
  attendanceClaim: string;
}

export interface AttendancePunch {
  _id: string;
  punchType: "in" | "out";
  punchAt: string;
  provider: string;
  externalEventId?: string;
  mappingStatus: string;
}

export interface AttendanceRecord {
  _id: string;
  status: AttendanceStatus;
  isReconciled: boolean;
  reconciliationReason?: string;
  reconciledAt?: string;
  adjustmentHistory?: Array<{
    previousStatus?: string;
    newStatus: string;
    reason: string;
    actorId: string;
    changedAt: string;
  }>;
}

export interface AttendanceRegisterRow {
  staff: AttendanceStaff;
  record: AttendanceRecord | null;
  punches: AttendancePunch[];
  status: AttendanceRegisterStatus;
}

export interface AttendanceRegister {
  date: string;
  timezone: string;
  operatingHours: Record<string, { openTime?: string; closeTime?: string; isOpen?: boolean }> | null;
  data: AttendanceRegisterRow[];
  total: number;
}

export interface AttendanceDetail {
  date: string;
  timezone: string;
  operatingHours: AttendanceRegister["operatingHours"];
  staff: AttendanceStaff;
  record: AttendanceRecord | null;
  status: AttendanceRegisterStatus;
  punches: AttendancePunch[];
  approvedLeaves: Array<{ _id: string; leaveCode: string; leaveType: string; dates: string[] }>;
  exceptions: Array<{ leaveId: string; decision: string; reason: string; resolvedAt: string }>;
  appointmentConflicts: Array<{
    leaveId: string;
    appointmentId: string;
    leaveCode: string;
    appointmentCode: string;
    status: "pending" | "resolved";
  }>;
  auditHistory: Array<{ action: string; description: string; createdAt: string; metadata?: Record<string, unknown> }>;
}

export interface AttendanceConflict {
  _id: string;
  staffId: AttendanceStaff | string;
  date: string;
  branchesInvolved: Array<{ branchId: { _id: string; name: string } | string }>;
  evidence?: Record<string, unknown>;
}

export interface ProviderStatus {
  supportedProviders: string[];
  configurations: Array<{
    providerName: string;
    integrationMethod?: string;
    isActive: boolean;
    syncStatus: string;
    lastSync?: string;
    lastErrorAt?: string;
  }>;
  syncStates: Array<{
    id: string;
    provider: string;
    deviceId?: string;
    streamIdentifier: string;
    syncStatus: string;
    outcome: string;
    lastSuccessfulCheckpoint?: string;
    hasError: boolean;
    lastAttemptedAt?: string;
    lastSuccessfulAt?: string;
    processedCount: number;
    eventCount: number;
  }>;
}

export interface StaffDeviceMapping {
  _id: string;
  organizationId: string;
  branchId: string;
  provider: string;
  deviceId: string;
  externalEmployeeCode: string;
  staffId: {
    _id: string;
    name: string;
    staffCode: string;
    email?: string;
    phone?: string;
    avatar?: string;
    role?: string;
    isActive: boolean;
  };
  mappingStatus: 'mapped' | 'unmapped' | 'partial' | 'unknown';
  mappingMethod: 'code_match' | 'name_match' | 'phone_match' | 'admin_overriden';
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  createdBy?: {
    _id: string;
    name: string;
    staffCode?: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    staffCode?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StaffDeviceMappingPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StaffDeviceMappingListResponse {
  mappings: StaffDeviceMapping[];
  pagination: StaffDeviceMappingPagination;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: StaffDeviceMappingPagination;
  message?: string;
}

const currentBranch = { branchScope: "current" as const };

export async function getAttendanceRegister(params: { date: string; search?: string; status?: string }) {
  const { data } = await apiClient.get<ApiResponse<AttendanceRegister>>("/attendance/records", {
    params,
    ...currentBranch,
  });
  return data.data;
}

export async function getAttendanceDetail(staffId: string, date: string) {
  const { data } = await apiClient.get<ApiResponse<AttendanceDetail>>(`/attendance/staff/${staffId}`, {
    params: { date },
    ...currentBranch,
  });
  return data.data;
}

export async function adjustAttendance(payload: { staffId: string; date: string; status: AttendanceStatus; reason: string }) {
  const { data } = await apiClient.post<ApiResponse<AttendanceRecord>>("/attendance/records/adjust", payload, currentBranch);
  return data.data;
}

export async function getBranchAttendanceConflicts() {
  const { data } = await apiClient.get<ApiResponse<AttendanceConflict[]>>("/attendance/branch-conflicts", currentBranch);
  return data.data;
}

export async function resolveBranchAttendanceConflict(payload: { conflictId: string; reason: string }) {
  const { data } = await apiClient.post<ApiResponse<AttendanceConflict>>(
    `/attendance/branch-conflicts/${payload.conflictId}/resolve`,
    { reason: payload.reason },
    currentBranch,
  );
  return data.data;
}

export async function getLeaveAppointmentConflicts(date: string) {
  const { data } = await apiClient.get<ApiResponse<{ date: string; data: AttendanceDetail["appointmentConflicts"]; total: number }>>(
    "/attendance/leave-appointment-conflicts",
    { params: { date }, ...currentBranch },
  );
  return data.data;
}

export async function resolveLeaveAppointmentConflict(payload: { leaveId: string; appointmentId: string; date: string; reason: string }) {
  const { data } = await apiClient.post<ApiResponse<unknown>>(
    `/attendance/leave-appointment-conflicts/${payload.leaveId}/${payload.appointmentId}/resolve`,
    { date: payload.date, reason: payload.reason },
    currentBranch,
  );
  return data.data;
}

export async function recordLeaveException(payload: { leaveId: string; date: string; decision: "worked" | "absent" | "half-day"; reason: string }) {
  const { data } = await apiClient.post<ApiResponse<unknown>>("/attendance/leave-exceptions", payload, currentBranch);
  return data.data;
}

export async function getProviderStatus() {
  const { data } = await apiClient.get<ApiResponse<ProviderStatus>>("/attendance/providers/status", currentBranch);
  return data.data;
}

export async function ingestSimulatorEvents(payload: {
  checkpoint: string;
  streamIdentifier: "daily" | "realtime" | "manual_import";
  events: Array<Record<string, unknown>>;
}) {
  const { data } = await apiClient.post<ApiResponse<unknown>>("/attendance/providers/simulator/events", payload, currentBranch);
  return data.data;
}

export async function getStaffDeviceMappings(params?: {
  staffId?: string;
  provider?: string;
  deviceId?: string;
  externalEmployeeCode?: string;
  mappingStatus?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<StaffDeviceMappingListResponse> {
  const { data } = await apiClient.get<ApiResponse<StaffDeviceMapping[]>>("/attendance/mappings", {
    params,
    ...currentBranch,
  });
  return {
    mappings: data.data || [],
    pagination: data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
  };
}

export async function getStaffDeviceMappingById(id: string): Promise<StaffDeviceMapping> {
  const { data } = await apiClient.get<ApiResponse<StaffDeviceMapping>>(`/attendance/mappings/${id}`, currentBranch);
  return data.data;
}

export async function createStaffDeviceMapping(payload: {
  staffId: string;
  provider: string;
  deviceId: string;
  externalEmployeeCode: string;
  notes?: string;
  effectiveFrom?: string;
}): Promise<StaffDeviceMapping> {
  const { data } = await apiClient.post<ApiResponse<StaffDeviceMapping>>("/attendance/mappings", payload, currentBranch);
  return data.data;
}

export async function updateStaffDeviceMapping(
  id: string,
  payload: {
    notes?: string;
    effectiveTo?: string | null;
    mappingStatus?: 'mapped' | 'unmapped' | 'partial' | 'unknown';
  }
): Promise<StaffDeviceMapping> {
  const { data } = await apiClient.patch<ApiResponse<StaffDeviceMapping>>(`/attendance/mappings/${id}`, payload, currentBranch);
  return data.data;
}

export async function deactivateStaffDeviceMapping(id: string): Promise<StaffDeviceMapping> {
  const { data } = await apiClient.delete<ApiResponse<StaffDeviceMapping>>(`/attendance/mappings/${id}`, currentBranch);
  return data.data;
}

export async function recordStaffPunch(payload: RecordStaffPunchPayload): Promise<RecordStaffPunchResponse> {
  const { data } = await apiClient.post<ApiResponse<RecordStaffPunchResponse>>("/attendance/punch", payload, currentBranch);
  return data.data;
}

export async function getMonthlyMusterRoll(params: {
  monthYear: string;
  branchId?: string;
  search?: string;
  status?: string;
}): Promise<MonthlyMusterRollResponse> {
  const { data } = await apiClient.get<ApiResponse<MonthlyMusterRollResponse>>("/attendance/monthly-summary", {
    params,
    ...currentBranch,
  });
  return data.data;
}

export interface UpsertProviderConfigurationPayload {
  endpointUrl?: string;
  integrationMethod?: "webhook" | "polling" | "file";
  isActive?: boolean;
  credentials?: Record<string, string>;
}

export async function upsertProviderConfiguration(
  providerName: string,
  payload: UpsertProviderConfigurationPayload,
) {
  const { data } = await apiClient.put<ApiResponse<ProviderStatus["configurations"][number]>>(
    `/attendance/providers/${encodeURIComponent(providerName)}/configuration`,
    payload,
    currentBranch,
  );
  return data.data;
}

export async function toggleProviderConfigurationStatus(
  providerName: string,
  isActive: boolean,
) {
  const { data } = await apiClient.patch<ApiResponse<ProviderStatus["configurations"][number]>>(
    `/attendance/providers/${encodeURIComponent(providerName)}/configuration/status`,
    { isActive },
    currentBranch,
  );
  return data.data;
}
