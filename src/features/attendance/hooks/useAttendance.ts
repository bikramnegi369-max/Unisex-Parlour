import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import {
  adjustAttendance,
  getAttendanceDetail,
  getAttendanceRegister,
  getBranchAttendanceConflicts,
  getLeaveAppointmentConflicts,
  getProviderStatus,
  ingestSimulatorEvents,
  recordLeaveException,
  resolveBranchAttendanceConflict,
  resolveLeaveAppointmentConflict,
  getStaffDeviceMappings,
  getStaffDeviceMappingById,
  createStaffDeviceMapping,
  updateStaffDeviceMapping,
  deactivateStaffDeviceMapping,
} from "../api/attendance.api";

function useAttendanceAccess(permission: "attendance.view" | "attendance.adjust" | "attendance.punch" = "attendance.view") {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();
  return {
    enabled: isAuthenticated && Boolean(currentBranchId) && hasPermission(user, permission),
    currentBranchId,
    getBranchQueryKey,
  };
}

export function useAttendanceRegister(date: string, search: string, status: string) {
  const { enabled, getBranchQueryKey } = useAttendanceAccess();
  return useQuery({
    queryKey: getBranchQueryKey("attendance-register", [date, search, status]),
    queryFn: () => getAttendanceRegister({ date, search, status: status === "all" ? undefined : status }),
    enabled: enabled && Boolean(date),
  });
}

export function useAttendanceDetail(staffId: string | null, date: string) {
  const { enabled, getBranchQueryKey } = useAttendanceAccess();
  return useQuery({
    queryKey: getBranchQueryKey("attendance-detail", [staffId || "", date]),
    queryFn: () => getAttendanceDetail(staffId!, date),
    enabled: enabled && Boolean(staffId),
  });
}

export function useBranchAttendanceConflicts() {
  const { enabled, getBranchQueryKey } = useAttendanceAccess();
  return useQuery({
    queryKey: getBranchQueryKey("attendance-branch-conflicts"),
    queryFn: getBranchAttendanceConflicts,
    enabled,
  });
}

export function useLeaveAppointmentConflicts(date: string) {
  const { enabled, getBranchQueryKey } = useAttendanceAccess();
  return useQuery({
    queryKey: getBranchQueryKey("attendance-leave-conflicts", [date]),
    queryFn: () => getLeaveAppointmentConflicts(date),
    enabled: enabled && Boolean(date),
  });
}

export function useAttendanceProviderStatus() {
  const { enabled, getBranchQueryKey } = useAttendanceAccess();
  return useQuery({
    queryKey: getBranchQueryKey("attendance-provider-status"),
    queryFn: getProviderStatus,
    enabled,
  });
}

function useAttendanceMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("attendance-register") }),
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("attendance-detail") }),
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("attendance-branch-conflicts") }),
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("attendance-leave-conflicts") }),
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("attendance-provider-status") }),
      ]);
    },
  });
}

export const useAdjustAttendance = () => useAttendanceMutation(adjustAttendance);
export const useResolveBranchAttendanceConflict = () => useAttendanceMutation(resolveBranchAttendanceConflict);
export const useResolveLeaveAppointmentConflict = () => useAttendanceMutation(resolveLeaveAppointmentConflict);
export const useRecordLeaveException = () => useAttendanceMutation(recordLeaveException);
export const useIngestSimulatorEvents = () => useAttendanceMutation(ingestSimulatorEvents);

export function useStaffDeviceMappings(params?: {
  staffId?: string;
  provider?: string;
  deviceId?: string;
  externalEmployeeCode?: string;
  mappingStatus?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { enabled, getBranchQueryKey } = useAttendanceAccess();
  return useQuery({
    queryKey: getBranchQueryKey("staff-device-mappings", [
      params?.staffId || "",
      params?.provider || "",
      params?.deviceId || "",
      params?.externalEmployeeCode || "",
      params?.mappingStatus || "",
      params?.isActive !== undefined ? String(params.isActive) : "",
      params?.search || "",
      params?.page || 1,
      params?.limit || 20,
    ]),
    queryFn: () => getStaffDeviceMappings(params),
    enabled,
  });
}

export function useStaffDeviceMappingById(id: string | null) {
  const { enabled, getBranchQueryKey } = useAttendanceAccess();
  return useQuery({
    queryKey: getBranchQueryKey("staff-device-mapping-detail", [id || ""]),
    queryFn: () => getStaffDeviceMappingById(id!),
    enabled: enabled && Boolean(id),
  });
}

export function useCreateStaffDeviceMapping() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();
  return useMutation({
    mutationFn: createStaffDeviceMapping,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("staff-device-mappings") }),
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("attendance-register") }),
      ]);
    },
  });
}

export function useUpdateStaffDeviceMapping() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateStaffDeviceMapping>[1] }) =>
      updateStaffDeviceMapping(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("staff-device-mappings") }),
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("staff-device-mapping-detail") }),
      ]);
    },
  });
}

export function useDeactivateStaffDeviceMapping() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();
  return useMutation({
    mutationFn: deactivateStaffDeviceMapping,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("staff-device-mappings") }),
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("staff-device-mapping-detail") }),
        queryClient.invalidateQueries({ queryKey: getBranchQueryKey("attendance-register") }),
      ]);
    },
  });
}
