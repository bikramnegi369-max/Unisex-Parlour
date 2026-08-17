import { useQuery } from "@tanstack/react-query";
import {
  getRoles,
  getRoleById,
  getPermissions,
  getPermissionModules,
} from "../api/roles.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { GetPermissionsParams } from "../types/roles.types";

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
