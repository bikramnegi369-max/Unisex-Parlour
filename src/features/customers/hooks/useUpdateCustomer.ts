import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomer } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import type { Customer } from "../types/customer.types";

interface UpdateCustomerParams {
  id: string;
  payload: Omit<Partial<Customer>, "id" | "organizationId" | "homeBranchId" | "visitedBranchIds" | "isActive">;
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateCustomerParams) => updateCustomer(id, payload),
    onSuccess: (data) => {
      // Invalidate both directory and detail views for this customer
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("customers") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("customer", [data.id]),
      });
    },
  });
}

