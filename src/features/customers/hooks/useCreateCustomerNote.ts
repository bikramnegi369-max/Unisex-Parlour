import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomerNote } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useCreateCustomerNote() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ customerId, text }: { customerId: string; text: string }) =>
      createCustomerNote(customerId, { text }),
    onSuccess: (_, { customerId }) => {
      // Invalidate customer notes (prefix matches all pages/params)
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("customer-notes", [customerId]),
      });
      // Invalidate customer activity
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("customer-activity", [customerId]),
      });
    },
  });
}
