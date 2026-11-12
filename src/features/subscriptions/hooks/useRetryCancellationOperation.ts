import { useMutation, useQueryClient } from "@tanstack/react-query";
import { retryCancellationOperation } from "../api/subscriptions.api";
import type { CancellationOperationData } from "../types/subscription.types";

interface RetryCancellationOperationVariables {
  subscriptionId: string;
  operationId: string;
}

export function useRetryCancellationOperation() {
  const queryClient = useQueryClient();

  return useMutation<CancellationOperationData, Error, RetryCancellationOperationVariables>({
    mutationFn: ({ subscriptionId, operationId }) =>
      retryCancellationOperation(subscriptionId, operationId),
    onSuccess: (data, { subscriptionId, operationId }) => {
      queryClient.setQueryData(
        ["subscriptions", "cancel-operations", subscriptionId, operationId],
        data
      );
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "cancel-operations", subscriptionId, operationId],
      });
    },
  });
}

