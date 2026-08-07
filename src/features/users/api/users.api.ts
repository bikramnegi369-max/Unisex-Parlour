import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  UserResponseDTO,
  GetUsersParams,
  CreateUserPayload,
  UpdateUserPayload,
  UpdateUserStatus,
} from "../types/users.types";

export const getUsers = async (params: GetUsersParams = {}): Promise<PaginatedResponse<UserResponseDTO>> => {
  const { data } = await apiClient.get<PaginatedResponse<UserResponseDTO>>("/users", {
    params,
    branchScope: "current",
  });
  return data;
};

export const getUser = async (id: string): Promise<UserResponseDTO> => {
  const { data } = await apiClient.get<{ success: boolean; data: UserResponseDTO }>(`/users/${id}`, {
    branchScope: "current",
  });
  return data.data;
};

export const createUser = async (payload: CreateUserPayload): Promise<UserResponseDTO> => {
  const { data } = await apiClient.post<{ success: boolean; data: UserResponseDTO }>("/users", payload, {
    branchScope: "current",
  });
  return data.data;
};

export const updateUser = async (id: string, payload: UpdateUserPayload): Promise<UserResponseDTO> => {
  const { data } = await apiClient.patch<{ success: boolean; data: UserResponseDTO }>(`/users/${id}`, payload, {
    branchScope: "current",
  });
  return data.data;
};

export const updateUserStatus = async (id: string, status: UpdateUserStatus): Promise<UserResponseDTO> => {
  const { data } = await apiClient.patch<{ success: boolean; data: UserResponseDTO }>(`/users/${id}/status`, { status }, {
    branchScope: "current",
  });
  return data.data;
};
