import { useQuery } from "@tanstack/react-query";
import { expensesApi } from "../api/expenses.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function usePettyCashBalance() {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isEnabled =
    isAuthenticated &&
    hasPermission(user, "expenses.view") &&
    currentBranchId !== null &&
    currentBranchId !== "all";

  const queryKey = getBranchQueryKey("petty-cash-balance");

  return useQuery({
    queryKey,
    queryFn: () => expensesApi.getPettyCashBalance(),
    enabled: isEnabled,
  });
}
