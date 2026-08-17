import { useQuery } from "@tanstack/react-query";
import {
  getEmployees,
  getEmployee,
  GetEmployeesParams,
  getStaffBranches,
  getStaffServices,
} from "../api/employees.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useEmployees(params: GetEmployeesParams = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "employees.view");

  const isEnabled = isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("employees", [params]);

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

  return useQuery({
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

  return useQuery({
    queryKey,
    queryFn: () => getStaffServices(id!),
    enabled: isEnabled,
  });
}
