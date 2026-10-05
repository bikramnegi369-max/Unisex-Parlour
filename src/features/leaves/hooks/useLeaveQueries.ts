import { useQuery } from "@tanstack/react-query";
import { getLeaves, getLeave } from "../api/leaves.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { LeaveListQuery } from "../types/leaves.types";

export function useLeaves(
  params: LeaveListQuery = {},
  options?: { enabled?: boolean }
) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "employees.leaves.view");

  const isBaseEnabled =
    isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);
  const isEnabled = isBaseEnabled && (options?.enabled !== false);

  const queryKey = getBranchQueryKey("leaves", [params]);

  return useQuery({
    queryKey,
    queryFn: () => getLeaves(params),
    enabled: isEnabled,
  });
}

export function useLeave(id: string | undefined) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "employees.leaves.view");

  const isEnabled = isAuthenticated && hasViewPermission && !!id && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("leave", [id || ""]);

  return useQuery({
    queryKey,
    queryFn: () => getLeave(id!),
    enabled: isEnabled,
  });
}
