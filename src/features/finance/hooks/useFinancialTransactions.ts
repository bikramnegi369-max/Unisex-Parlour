import { useQuery } from "@tanstack/react-query";
import { financeApi } from "../api/finance.api";
import { TransactionsQueryParams } from "../types/finance.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useFinancialTransactions(params: TransactionsQueryParams = {}) {
  const { getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isEnabled =
    isAuthenticated &&
    (hasPermission(user, "finance.transactions.view") || hasPermission(user, "finance.view"));

  const queryKey = getBranchQueryKey("financial-transactions", [params]);

  return useQuery({
    queryKey,
    queryFn: () => financeApi.getTransactions(params),
    enabled: isEnabled,
  });
}
