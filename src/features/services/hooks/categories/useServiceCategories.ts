import { useQuery } from "@tanstack/react-query";
import { getServiceCategories } from "../../api/serviceCategories.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { ServiceCategoryFilters } from "../../types/filters.types";

export function useServiceCategories(filters: ServiceCategoryFilters = {}) {
  const { isAuthenticated, user } = useAuth();

  const hasViewPermission = hasPermission(user, "services.view");
  const isEnabled = isAuthenticated && hasViewPermission;

  const queryKey = getScopeQueryKey("service-categories", null, [filters]);

  return useQuery({
    queryKey,
    queryFn: () => getServiceCategories(filters),
    enabled: isEnabled,
  });
}
