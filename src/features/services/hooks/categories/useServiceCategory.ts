import { useQuery } from "@tanstack/react-query";
import { getServiceCategory } from "../../api/serviceCategories.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useServiceCategory(id: string) {
  const { isAuthenticated, user } = useAuth();
  const { getBranchQueryKey } = useBranchContext();
  const hasViewPermission = hasPermission(user, "services.view");
  const isEnabled = isAuthenticated && hasViewPermission && !!id;

  return useQuery({
    queryKey: getBranchQueryKey("service-category", [id]),
    queryFn: () => getServiceCategory(id),
    enabled: isEnabled,
  });
}
