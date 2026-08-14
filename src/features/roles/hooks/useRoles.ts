import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoles,
  getRoleById,
  createRole,
  updateRolePermissions,
  deleteRole,
  getPermissions,
  getPermissionModules,
} from "../api/roles.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type {
  CreateRolePayload,
  UpdateRolePermissionsPayload,
  GetPermissionsParams,
} from "../types/roles.types";

export function useRoles() {
  const { isAuthenticated, user } = useAuth();
  const hasViewPermission = hasPermission(user, "roles.view");

  return useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    enabled: isAuthenticated && hasViewPermission,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRole(id: string | undefined) {
  const { isAuthenticated, user } = useAuth();
  const hasViewPermission = hasPermission(user, "roles.view");

  return useQuery({
    queryKey: ["roles", id],
    queryFn: () => getRoleById(id!),
    enabled: isAuthenticated && hasViewPermission && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePermissions(params: GetPermissionsParams = {}) {
  const { isAuthenticated, user } = useAuth();
  const hasViewPermission = hasPermission(user, "roles.view");

  return useQuery({
    queryKey: ["permissions", params],
    queryFn: () => getPermissions(params),
    enabled: isAuthenticated && hasViewPermission,
    staleTime: 30 * 60 * 1000,
  });
}

export function usePermissionModules() {
  const { isAuthenticated, user } = useAuth();
  const hasViewPermission = hasPermission(user, "roles.view");

  return useQuery({
    queryKey: ["permission-modules"],
    queryFn: getPermissionModules,
    enabled: isAuthenticated && hasViewPermission,
    staleTime: 60 * 60 * 1000,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRolePayload) => createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

interface UpdateRolePermissionsParams {
  id: string;
  payload: UpdateRolePermissionsPayload;
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateRolePermissionsParams) =>
      updateRolePermissions(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", variables.id] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", id] });
    },
  });
}
