import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomerNote } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { getScopeQueryKey } from "@/lib/api/queryKeys";

export function useCreateCustomerNote() {
  const queryClient = useQueryClient();
  const { currentBranchId, getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ customerId, text, branchId }: { customerId: string; text: string; branchId: string }) =>
      createCustomerNote(customerId, { text, branchId }),
    onSuccess: (_, { customerId, branchId }) => {
      // Invalidate customer notes (prefix matches all pages/params)
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("customer-notes", [customerId]),
      });
      // Invalidate customer activity
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("customer-activity", [customerId]),
      });

      // If current branch context differs from the note's target branch, also invalidate target branch queries
      if (currentBranchId !== branchId) {
        queryClient.invalidateQueries({
          queryKey: getScopeQueryKey("customer-notes", branchId, [customerId]),
        });
        queryClient.invalidateQueries({
          queryKey: getScopeQueryKey("customer-activity", branchId, [customerId]),
        });
      }
    },
  });
}
