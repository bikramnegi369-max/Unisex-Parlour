import { useQuery } from "@tanstack/react-query";
import { getCustomers, GetCustomersParams } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useCustomers(params: GetCustomersParams = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "customers.view");
  
  // Enable query if authenticated AND has customers.view permission AND (we have a selected branch OR the user has org-wide access)
  const isEnabled = isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("customers", [params]);

  const query = useQuery({
    queryKey,
    queryFn: () => getCustomers(params),
    enabled: isEnabled,
  });

  return query;
}

