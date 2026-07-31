import { useQuery } from "@tanstack/react-query";
import { getServiceCategories } from "../../api/serviceCategories.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { serviceCategoryKeys } from "../../api/serviceCategoryKeys";
import type { ServiceCategoryFilters } from "../../types/filters.types";

export function useServiceCategories(filters: ServiceCategoryFilters = {}) {
  const { currentBranchId } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "services.view");
  const isEnabled = isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);

  const queryKey = serviceCategoryKeys.list(currentBranchId, filters);

  return useQuery({
    queryKey,
    queryFn: () => getServiceCategories(filters),
    enabled: isEnabled,
  });
}
