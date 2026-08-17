import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRole,
  updateRolePermissions,
  deleteRole,
} from "../api/roles.api";
import type {
  CreateRolePayload,
  UpdateRolePermissionsPayload,
} from "../types/roles.types";

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRolePayload) => createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

interface UpdateRolePermissionsParams {
  id: string;
  payload: UpdateRolePermissionsPayload;
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateRolePermissionsParams) =>
      updateRolePermissions(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", variables.id] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", id] });
    },
  });
}
