import { useQuery } from "@tanstack/react-query";
import { financeApi } from "../api/finance.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useBranchPerformance(
  startDate?: string,
  endDate?: string,
  page?: number,
  limit?: number
) {
  const { getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isEnabled = isAuthenticated && hasPermission(user, "finance.view");
  const queryKey = getBranchQueryKey("branch-performance", [
    { startDate, endDate, page, limit },
  ]);

  return useQuery({
    queryKey,
    queryFn: () =>
      financeApi.getBranchPerformance(startDate, endDate, page, limit),
    enabled: isEnabled,
  });
}
