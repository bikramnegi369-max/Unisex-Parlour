import { useQuery } from "@tanstack/react-query";
import { getCustomerActivity, type GetCustomerActivityParams } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useCustomerActivity(customerId: string | null, params: GetCustomerActivityParams = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "customers.view");
  const isEnabled = isAuthenticated && hasViewPermission && !!customerId && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("customer-activity", [customerId || "", params]);

  const query = useQuery({
    queryKey,
    queryFn: () => getCustomerActivity(customerId!, params),
    enabled: isEnabled,
    retry: false,
  });

  return query;
}
