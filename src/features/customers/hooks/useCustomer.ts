import { useQuery } from "@tanstack/react-query";
import { getCustomer } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useCustomer(id: string | null) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const isEnabled = isAuthenticated && !!id && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("customer", [id || ""]);

  const query = useQuery({
    queryKey,
    queryFn: () => getCustomer(id!),
    enabled: isEnabled,
    retry: false, // Don't spam retries on 404 or 403 authorization failures
  });

  return query;
}
