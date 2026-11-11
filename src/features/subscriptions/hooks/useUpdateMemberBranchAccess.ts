import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMemberBranchAccess } from "../api/subscriptions.api";
import type { Subscription } from "../types/subscription.types";

interface UpdateMemberBranchAccessVariables {
  subscriptionId: string;
  memberCustomerId: string;
  permittedBranchIds: string[];
}

export function useUpdateMemberBranchAccess() {
  const queryClient = useQueryClient();

  return useMutation<Subscription, Error, UpdateMemberBranchAccessVariables>({
    mutationFn: ({ subscriptionId, memberCustomerId, permittedBranchIds }) =>
      updateMemberBranchAccess(subscriptionId, memberCustomerId, permittedBranchIds),
    onSuccess: (_, { subscriptionId }) => {
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "detail", subscriptionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "list"],
      });
    },
  });
}

