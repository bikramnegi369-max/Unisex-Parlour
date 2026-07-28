import { useQuery } from "@tanstack/react-query";
import { getCustomers, GetCustomersParams } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useCustomers(params: GetCustomersParams = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  // Enable query if authenticated AND (we have a selected branch OR the user has org-wide access to view All Branches)
  const isEnabled = isAuthenticated && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("customers", [params]);

  const query = useQuery({
    queryKey,
    queryFn: () => getCustomers(params),
    enabled: isEnabled,
  });

  return query;
}
