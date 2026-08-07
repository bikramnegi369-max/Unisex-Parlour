import { useQuery } from "@tanstack/react-query";
import { getUser } from "../api/users.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useUser(id: string | null) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "users.view");
  const isEnabled = isAuthenticated && hasViewPermission && !!id && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("user", [id || ""]);

  const query = useQuery({
    queryKey,
    queryFn: () => getUser(id!),
    enabled: isEnabled,
    retry: false,
  });

  return query;
}
