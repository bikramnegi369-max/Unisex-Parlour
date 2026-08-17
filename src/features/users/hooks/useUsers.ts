import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api/users.api";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { GetUsersParams } from "../types/users.types";

export function useUsers(params: GetUsersParams = {}) {
  const { isAuthenticated, user } = useAuth();

  const hasViewPermission = hasPermission(user, "users.view");
  const isEnabled = isAuthenticated && hasViewPermission;

  const queryKey = getScopeQueryKey("users", null, [params]);

  const query = useQuery({
    queryKey,
    queryFn: () => getUsers(params),
    enabled: isEnabled,
  });

  return query;
}
