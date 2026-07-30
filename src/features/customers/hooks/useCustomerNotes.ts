import { useQuery } from "@tanstack/react-query";
import { getCustomerNotes, type GetCustomerNotesParams } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useCustomerNotes(customerId: string | null, params: GetCustomerNotesParams = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "customers.view");
  const isEnabled = isAuthenticated && hasViewPermission && !!customerId && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("customer-notes", [customerId || "", params]);

  const query = useQuery({
    queryKey,
    queryFn: () => getCustomerNotes(customerId!, params),
    enabled: isEnabled,
    retry: false,
  });

  return query;
}
