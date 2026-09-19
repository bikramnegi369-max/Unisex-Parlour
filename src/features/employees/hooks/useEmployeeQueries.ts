import { useQuery, useQueries } from "@tanstack/react-query";
import {
  getEmployees,
  getEmployee,
  GetEmployeesParams,
  getStaffBranches,
  getStaffServices,
} from "../api/employees.api";
import type { StaffBranch, StaffService } from "../types/employee.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useMemo } from "react";

export function useEmployees(params: GetEmployeesParams = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "employees.view");

  const effectiveBranchId =
    params.branchId !== undefined ? params.branchId : currentBranchId;

  const isEnabled =
    isAuthenticated &&
    hasViewPermission &&
    (effectiveBranchId !== null || isOrgWide);

  const queryKey =
    params.branchId !== undefined
      ? [
          "employees",
          {
            scope: params.branchId ? "branch" : "organization",
            branchId: params.branchId,
          },
          params,
        ]
      : getBranchQueryKey("employees", [params]);

  return useQuery({
    queryKey,
    queryFn: () => getEmployees(params),
    enabled: isEnabled,
  });
}

export function useEmployee(id: string | undefined) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "employees.view");

  const isEnabled = isAuthenticated && hasViewPermission && !!id && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("employee", [id || ""]);

  return useQuery({
    queryKey,
    queryFn: () => getEmployee(id!),
    enabled: isEnabled,
  });
}

export function useStaffBranches(id: string | undefined) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();
  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "employees.view");

  const isEnabled = isAuthenticated && hasViewPermission && !!id && (currentBranchId !== null || isOrgWide);
  const queryKey = getBranchQueryKey("staff-branches", [id || ""]);

  return useQuery<StaffBranch[]>({
    queryKey,
    queryFn: () => getStaffBranches(id!),
    enabled: isEnabled,
  });
}

export function useStaffServices(id: string | undefined) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();
  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "employees.view");

  const isEnabled = isAuthenticated && hasViewPermission && !!id && (currentBranchId !== null || isOrgWide);
  const queryKey = getBranchQueryKey("staff-services", [id || ""]);

  return useQuery<StaffService[]>({
    queryKey,
    queryFn: () => getStaffServices(id!),
    enabled: isEnabled,
  });
}

/**
 * Batch fetches service capabilities for a list of staff members.
 * Returns a map of staffId -> string[] (assigned service IDs) and a combined loading state.
 */
export function useMultipleStaffServices(staffIds: string[]) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();
  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "employees.view");

  const isBaseEnabled =
    isAuthenticated &&
    hasViewPermission &&
    (currentBranchId !== null || isOrgWide);

  const results = useQueries({
    queries: staffIds.map((staffId) => ({
      queryKey: getBranchQueryKey("staff-services", [staffId]),
      queryFn: () => getStaffServices(staffId),
      enabled: isBaseEnabled && Boolean(staffId),
      staleTime: 1000 * 30, // 30 seconds for quick freshness when switching screens
    })),
  });

  const staffServicesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    staffIds.forEach((staffId, index) => {
      const queryResult = results[index];
      const items = queryResult?.data || [];
      map[staffId] = items
        .filter((item) => item.isActive)
        .map((item) => {
          if (typeof item.serviceId === "object" && item.serviceId !== null) {
            const populated = item.serviceId as { _id?: string; id?: string };
            return populated._id || populated.id || "";
          }
          return String(item.serviceId);
        })
        .filter(Boolean);
    });
    return map;
  }, [staffIds, results]);

  const isLoading = results.some((r) => r.isLoading);

  return {
    staffServicesMap,
    isLoading,
  };
}
