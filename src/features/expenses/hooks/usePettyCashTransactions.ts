import { useQuery } from "@tanstack/react-query";
import { expensesApi } from "../api/expenses.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function usePettyCashTransactions(page = 1, limit = 50, enabled = true) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isEnabled =
    enabled &&
    isAuthenticated &&
    hasPermission(user, "expenses.view") &&
    currentBranchId !== null &&
    currentBranchId !== "all";

  const queryKey = getBranchQueryKey("petty-cash-transactions", [{ page, limit }]);

  return useQuery({
    queryKey,
    queryFn: () => expensesApi.listPettyCashTransactions(page, limit),
    enabled: isEnabled,
  });
}
