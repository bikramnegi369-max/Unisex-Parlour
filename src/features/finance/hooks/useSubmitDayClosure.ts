import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import { financeApi } from "../api/finance.api";
import { SubmitDayClosurePayload } from "../types/finance.types";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useSubmitDayClosure() {
  const queryClient = useQueryClient();
  const { currentBranchId, getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (payload: SubmitDayClosurePayload) => {
      if (!currentBranchId || currentBranchId === "all") {
        throw new Error("Select a specific branch to submit register closure.");
      }
      return financeApi.submitDayClosure(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("day-closure-system-totals") });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("day-closures") });
      broadcastCrossTabInvalidation("finance");
    },
  });
}
