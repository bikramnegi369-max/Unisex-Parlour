import { useQuery } from "@tanstack/react-query";
import { financeApi } from "../api/finance.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useSystemTotals(businessDate: string, enabled = true) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isEnabled =
    enabled &&
    Boolean(businessDate) &&
    isAuthenticated &&
    hasPermission(user, "finance.view") &&
    currentBranchId !== null &&
    currentBranchId !== "all";

  const queryKey = getBranchQueryKey("day-closure-system-totals", [{ businessDate }]);

  return useQuery({
    queryKey,
    queryFn: () => financeApi.getSystemTotals(businessDate),
    enabled: isEnabled,
  });
}
