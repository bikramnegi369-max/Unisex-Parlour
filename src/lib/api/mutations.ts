import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EntityMutationOptions<TData, TError, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: (readonly unknown[] | unknown[])[];
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void | Promise<unknown>;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void | Promise<unknown>;
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
}

export function useEntityMutation<TData, TError = Error, TVariables = void, TContext = unknown>({
  mutationFn,
  invalidateKeys,
  onSuccess,
  onError,
  onMutate,
}: EntityMutationOptions<TData, TError, TVariables, TContext>) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    onMutate,
    onSuccess: async (data, variables, context) => {
      if (invalidateKeys && invalidateKeys.length > 0) {
        await Promise.all(
          invalidateKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key as readonly unknown[] })
          )
        );
      }
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    onError: async (error, variables, context) => {
      if (onError) {
        await onError(error, variables, context);
      }
    },
  });
}
