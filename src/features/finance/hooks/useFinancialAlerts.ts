import { useQuery } from "@tanstack/react-query";
import { financeApi } from "../api/finance.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useFinancialAlerts() {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isEnabled = isAuthenticated && hasPermission(user, "finance.view");

  const queryKey = getBranchQueryKey("financial-alerts");

  return useQuery({
    queryKey,
    queryFn: () => financeApi.getFinancialAlerts(),
    enabled: isEnabled,
  });
}
