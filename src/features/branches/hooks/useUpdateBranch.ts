"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBranch } from "../api/branches.api";
import type { UpdateBranchPayload } from "../types/branch.types";
import type { Branch } from "@/types/branch";

interface UpdateBranchVariables {
  id: string;
  payload: UpdateBranchPayload;
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation<Branch, Error, UpdateBranchVariables>({
    mutationFn: ({ id, payload }: UpdateBranchVariables) => updateBranch(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["branches", variables.id] });
    },
  });
}
