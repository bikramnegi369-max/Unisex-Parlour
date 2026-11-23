import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import { expensesApi } from "../api/expenses.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useApproveExpense() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (id: string) => expensesApi.approveExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("expenses") });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("expenses-summary") });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("petty-cash-balance") });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("petty-cash-transactions") });
      broadcastCrossTabInvalidation("expenses");
      broadcastCrossTabInvalidation("finance");
    },
  });
}
