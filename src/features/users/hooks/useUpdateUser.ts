import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "../api/users.api";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { UpdateUserPayload } from "../types/users.types";

interface UpdateUserParams {
  id: string;
  payload: UpdateUserPayload;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateUserParams) => updateUser(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("users", null) });
      queryClient.invalidateQueries({
        queryKey: getScopeQueryKey("user", null, [data.id]),
      });
    },
  });
}
