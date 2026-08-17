import { useQuery } from "@tanstack/react-query";
import { getUser } from "../api/users.api";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useUser(id: string | null) {
  const { isAuthenticated, user } = useAuth();

  const hasViewPermission = hasPermission(user, "users.view");
  const isEnabled = isAuthenticated && hasViewPermission && !!id;

  const queryKey = getScopeQueryKey("user", null, [id || ""]);

  const query = useQuery({
    queryKey,
    queryFn: () => getUser(id!),
    enabled: isEnabled,
    retry: false,
  });

  return query;
}
