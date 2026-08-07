import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  restoreEmployee,
  deleteEmployee,
  GetEmployeesParams,
  getStaffBranches,
  getStaffServices,
  assignStaffBranch,
  removeStaffBranch,
  assignStaffService,
  removeStaffService,
  linkUserAccount,
  unlinkUserAccount,
} from "../api/employees.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Employee, EmployeePayload, EmployeeStatus } from "../types/employee.types";

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
  currentEmployee: Employee;
}

export function useUpdateEmployeeStatus() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, status, currentEmployee }: UpdateStatusParams) =>
      updateEmployeeStatus(id, status, currentEmployee),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("employee", [data.id]),
      });
    },
  });
}

export function useRestoreEmployee() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (id: string) => restoreEmployee(id),
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

// --- Relationship Hooks ---

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

export function useAssignStaffBranch() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, branchId, isPrimary }: { id: string; branchId: string; isPrimary?: boolean }) =>
      assignStaffBranch(id, { branchId, isPrimary }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("staff-branches", [variables.id]) });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
    },
  });
}

export function useRemoveStaffBranch() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, branchId }: { id: string; branchId: string }) => removeStaffBranch(id, branchId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("staff-branches", [variables.id]) });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
    },
  });
}

export function useAssignStaffService() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, serviceId }: { id: string; serviceId: string }) => assignStaffService(id, { serviceId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("staff-services", [variables.id]) });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
    },
  });
}

export function useAssignMultipleStaffServices() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: async ({ id, serviceIds }: { id: string; serviceIds: string[] }) => {
      const results = await Promise.all(
        serviceIds.map((serviceId) => assignStaffService(id, { serviceId }))
      );
      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("staff-services", [variables.id]) });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
    },
  });
}

export function useRemoveStaffService() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, serviceId }: { id: string; serviceId: string }) => removeStaffService(id, serviceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("staff-services", [variables.id]) });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
    },
  });
}

export function useLinkUserAccount() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => linkUserAccount(id, userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employee", [data.id]) });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
    },
  });
}

export function useUnlinkUserAccount() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (id: string) => unlinkUserAccount(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employee", [data.id]) });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("employees") });
    },
  });
}
