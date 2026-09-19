import { useQuery } from "@tanstack/react-query";
import { getCustomers, GetCustomersParams } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export interface UseCustomersOptions {
  enabled?: boolean;
}

export function useCustomers(
  params: GetCustomersParams = {},
  options: UseCustomersOptions = {}
) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "customers.view");
  
  // If an explicit branchId was passed in params, use that; otherwise use active branch context
  const effectiveBranchId =
    params.branchId !== undefined ? params.branchId : currentBranchId;

  // Enable query if authenticated AND has customers.view permission AND (we have a selected branch OR the user has org-wide access)
  const isEnabled =
    (options.enabled !== undefined ? options.enabled : true) &&
    isAuthenticated &&
    hasViewPermission &&
    (effectiveBranchId !== null || isOrgWide);

  // Use getBranchQueryKey with effective branchId if explicitly specified, ensuring cache isolation
  const queryKey =
    params.branchId !== undefined
      ? ["customers", { scope: params.branchId ? "branch" : "organization", branchId: params.branchId }, params]
      : getBranchQueryKey("customers", [params]);

  const query = useQuery({
    queryKey,
    queryFn: () => getCustomers(params),
    enabled: isEnabled,
  });

  return query;
}

