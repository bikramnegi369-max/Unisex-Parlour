import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api/users.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { GetUsersParams } from "../types/users.types";

export function useUsers(params: GetUsersParams = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "users.view");
  const isEnabled = isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("users", [params]);

  const query = useQuery({
    queryKey,
    queryFn: () => getUsers(params),
    enabled: isEnabled,
  });

  return query;
}
