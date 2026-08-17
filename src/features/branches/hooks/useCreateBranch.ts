"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBranch } from "../api/branches.api";
import type { CreateBranchPayload } from "../types/branch.types";
import type { Branch } from "@/types/branch";

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation<Branch, Error, CreateBranchPayload>({
    mutationFn: (payload: CreateBranchPayload) => createBranch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}
