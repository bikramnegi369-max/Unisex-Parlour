import { useQuery } from "@tanstack/react-query";
import { getService } from "../../api/services.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { serviceKeys } from "../../api/serviceKeys";

export function useService(id: string) {
  const { isAuthenticated, user } = useAuth();
  const hasViewPermission = hasPermission(user, "services.view");
  const isEnabled = isAuthenticated && hasViewPermission && !!id;

  return useQuery({
    queryKey: serviceKeys.detail(id),
    queryFn: () => getService(id),
    enabled: isEnabled,
  });
}
