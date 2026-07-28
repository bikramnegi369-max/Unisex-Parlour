import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomer } from "../api/customers.api";
import type { Customer } from "../types/customer.types";

interface UpdateCustomerParams {
  id: string;
  payload: Omit<Partial<Customer>, "id" | "organizationId" | "homeBranchId" | "visitedBranchIds" | "isActive">;
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateCustomerParams) => updateCustomer(id, payload),
    onSuccess: (data) => {
      // Invalidate both directory and detail views for this customer
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "customer" && query.queryKey.includes(data.id),
      });
    },
  });
}
