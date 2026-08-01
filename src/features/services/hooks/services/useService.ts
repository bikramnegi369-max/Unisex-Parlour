import { useQuery } from "@tanstack/react-query";
import { getService } from "../../api/services.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useService(id: string) {
  const { isAuthenticated, user } = useAuth();
  const { getBranchQueryKey } = useBranchContext();
  const hasViewPermission = hasPermission(user, "services.view");
  const isEnabled = isAuthenticated && hasViewPermission && !!id;

  return useQuery({
    queryKey: getBranchQueryKey("service", [id]),
    queryFn: () => getService(id),
    enabled: isEnabled,
  });
}
