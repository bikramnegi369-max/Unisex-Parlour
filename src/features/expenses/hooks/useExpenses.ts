import { useQuery } from "@tanstack/react-query";
import { expensesApi } from "../api/expenses.api";
import { ExpenseQueryParams } from "../types/expense.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export interface UseExpensesOptions {
  enabled?: boolean;
}

export function useExpenses(
  params: ExpenseQueryParams = {},
  options: UseExpensesOptions = {}
) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "expenses.view");

  const isEnabled =
    (options.enabled !== undefined ? options.enabled : true) &&
    isAuthenticated &&
    hasViewPermission &&
    (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("expenses", [params]);

  return useQuery({
    queryKey,
    queryFn: () => expensesApi.listExpenses(params),
    enabled: isEnabled,
  });
}
