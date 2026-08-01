import { useQuery } from "@tanstack/react-query";
import { getServiceCategories } from "../../api/serviceCategories.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { ServiceCategoryFilters } from "../../types/filters.types";

export function useServiceCategories(filters: ServiceCategoryFilters = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "services.view");
  const isEnabled = isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("service-categories", [filters]);

  return useQuery({
    queryKey,
    queryFn: () => getServiceCategories(filters),
    enabled: isEnabled,
  });
}
