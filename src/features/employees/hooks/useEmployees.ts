import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  GetEmployeesParams,
} from "../api/employees.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { EmployeePayload, EmployeeStatus } from "../types/employee.types";

export function useEmployees(params: GetEmployeesParams = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "employees.view");

  // Enable query if authenticated AND has employees.view permission AND (we have a selected branch OR the user has org-wide access)
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

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (payload: EmployeePayload) => createEmployee(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
    },
  });
}

interface UpdateEmployeeParams {
  id: string;
  payload: EmployeePayload;
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateEmployeeParams) => updateEmployee(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("employee", [data.id]),
      });
    },
  });
}

interface UpdateStatusParams {
  id: string;
  status: EmployeeStatus;
}

export function useUpdateEmployeeStatus() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, status }: UpdateStatusParams) => updateEmployeeStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("employee", [data.id]),
      });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("employee", [id]),
      });
    },
  });
}
