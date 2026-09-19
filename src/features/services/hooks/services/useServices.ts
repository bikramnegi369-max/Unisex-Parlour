import { useQuery } from "@tanstack/react-query";
import { getServices } from "../../api/services.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { ServiceFilters } from "../../types/filters.types";

export function useServices(filters: ServiceFilters = {}) {
  const { isAuthenticated, user } = useAuth();

  const hasViewPermission = hasPermission(user, "services.view");
  const isEnabled = isAuthenticated && hasViewPermission;

  const queryKey = getScopeQueryKey("services", null, [filters]);

  return useQuery({
    queryKey,
    queryFn: () => getServices(filters),
    enabled: isEnabled,
  });
}
