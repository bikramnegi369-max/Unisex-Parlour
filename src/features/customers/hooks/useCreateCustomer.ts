import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import type { CustomerPayload } from "../types/customer.types";

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { currentBranchId, getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (payload: CustomerPayload) => {
      if (currentBranchId === null || currentBranchId === "all") {
        throw new Error("Select a specific branch to create a customer.");
      }
      return createCustomer(payload);
    },
    onSuccess: () => {
      // Invalidate only directory views in the current branch scope context
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("customers") });
    },
  });
}

