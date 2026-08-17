import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createLeave,
  updateLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
} from "../api/leaves.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import type {
  CreateLeavePayload,
  UpdateLeavePayload,
} from "../types/leaves.types";

export function useCreateLeave() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (payload: CreateLeavePayload) => createLeave(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("leaves") });
    },
  });
}

interface UpdateLeaveParams {
  id: string;
  payload: UpdateLeavePayload;
}

export function useUpdateLeave() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateLeaveParams) => updateLeave(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("leaves") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("leave", [data.id]),
      });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) => approveLeave(id, reviewNote),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("leaves") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("leave", [data.id]),
      });
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote: string }) => rejectLeave(id, reviewNote),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("leaves") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("leave", [data.id]),
      });
    },
  });
}

export function useCancelLeave() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, cancelReason }: { id: string; cancelReason: string }) => cancelLeave(id, cancelReason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("leaves") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("leave", [data.id]),
      });
    },
  });
}
