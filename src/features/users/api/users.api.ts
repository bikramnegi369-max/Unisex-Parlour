import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  UserResponseDTO,
  GetUsersParams,
  CreateUserPayload,
  UpdateUserPayload,
  UpdateUserStatus,
  UserRole,
  UserSummary,
} from "../types/users.types";

interface RawUserSummaryItem {
  id?: string;
  _id?: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  status?: UserSummary["status"];
  role?: unknown;
}

interface RawRoleItem {
  id?: string;
  _id?: string;
  name?: string;
  description?: string;
}

const mapUserKeys = (user: RawUserSummaryItem): UserSummary => ({
  id: user.id || user._id || "",
  name: user.name || "",
  username: user.username,
  email: user.email,
  phone: user.phone,
  status: (user.status as UserSummary["status"]) || "active",
});

export const getUsers = async (params: GetUsersParams = {}): Promise<PaginatedResponse<UserResponseDTO>> => {
  const { data } = await apiClient.get<PaginatedResponse<UserResponseDTO>>("/users", {
    params,
    branchScope: "current",
  });
  return data;
};

export const searchUsers = async (params: GetUsersParams = {}): Promise<PaginatedResponse<UserSummary>> => {
  const { data } = await apiClient.get<PaginatedResponse<UserResponseDTO>>("/users", {
    params,
    branchScope: "current",
  });

  return {
    ...data,
    data: (data.data || []).map((user) => mapUserKeys(user)),
  };
};

export const getRoles = async (): Promise<UserRole[]> => {
  const { data } = await apiClient.get<{ success: boolean; data: RawRoleItem[] }>("/rbac/roles");
  const rawRoles = Array.isArray(data?.data) ? data.data : [];
  return rawRoles.map((r: RawRoleItem) => ({
    id: String(r.id || r._id || r.name || ""),
    name: String(r.name || ""),
    description: String(r.description || ""),
  }));
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
