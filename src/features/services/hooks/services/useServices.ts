import { useQuery } from "@tanstack/react-query";
import { getServices } from "../../api/services.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { serviceKeys } from "../../api/serviceKeys";
import type { ServiceFilters } from "../../types/filters.types";

export function useServices(filters: ServiceFilters = {}) {
  const { currentBranchId } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "services.view");
  const isEnabled = isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);

  const queryKey = serviceKeys.list(currentBranchId, filters);

  return useQuery({
    queryKey,
    queryFn: () => getServices(filters),
    enabled: isEnabled,
  });
}
