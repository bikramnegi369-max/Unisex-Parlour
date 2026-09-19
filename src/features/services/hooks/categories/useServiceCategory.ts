import { useQuery } from "@tanstack/react-query";
import { getServiceCategory } from "../../api/serviceCategories.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { getScopeQueryKey } from "@/lib/api/queryKeys";

export function useServiceCategory(id: string) {
  const { isAuthenticated, user } = useAuth();
  const hasViewPermission = hasPermission(user, "services.view");
  const isEnabled = isAuthenticated && hasViewPermission && !!id;

  return useQuery({
    queryKey: getScopeQueryKey("service-category", null, [id]),
    queryFn: () => getServiceCategory(id),
    enabled: isEnabled,
  });
}
