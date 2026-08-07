import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "../api/users.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import type { UpdateUserPayload } from "../types/users.types";

interface UpdateUserParams {
  id: string;
  payload: UpdateUserPayload;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateUserParams) => updateUser(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("users") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("user", [data.id]),
      });
    },
  });
}
