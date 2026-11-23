import { useQuery } from "@tanstack/react-query";
import { expensesApi } from "../api/expenses.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useExpenseSummary(startDate?: string, endDate?: string) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "expenses.view");

  const isEnabled =
    isAuthenticated &&
    hasViewPermission &&
    (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("expenses-summary", [{ startDate, endDate }]);

  return useQuery({
    queryKey,
    queryFn: () => expensesApi.getExpenseSummary(),
    enabled: isEnabled,
  });
}
