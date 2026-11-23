import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import { expensesApi } from "../api/expenses.api";
import { CreateExpensePayload } from "../types/expense.types";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { currentBranchId, getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => {
      if (!currentBranchId || currentBranchId === "all") {
        throw new Error("Select a specific branch to record an expense.");
      }
      return expensesApi.createExpense(payload);
    },
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
