import { apiClient } from "@/lib/api/axios";
import type {
  Role,
  CreateRolePayload,
  UpdateRolePermissionsPayload,
  GetPermissionsParams,
  RoleListResponse,
  RoleDetailsResponse,
  PermissionsListResponse,
  PaginatedPermissionsResult,
  PermissionModulesResponse,
} from "../types/roles.types";

interface RawPermissionObject {
  key?: string;
  name?: string;
}

interface RawRoleDTO {
  id?: string;
  _id?: string;
  name?: string;
  description?: string;
  isSystem?: boolean;
  permissions?: Array<string | RawPermissionObject>;
  createdAt?: string;
  updatedAt?: string;
}

interface RawPermissionDTO {
  id?: string;
  _id?: string;
  key?: string;
  name?: string;
  module?: string;
  description?: string;
}

const mapRoleKeys = (role: RawRoleDTO | null | undefined): Role => ({
  id: String(role?.id || role?._id || role?.name || ""),
  name: String(role?.name || ""),
  description: role?.description ? String(role.description) : undefined,
  isSystem: Boolean(role?.isSystem),
  permissions: Array.isArray(role?.permissions)
    ? role.permissions.map((p) => (typeof p === "string" ? p : p.key || p.name || ""))
    : [],
  createdAt: role?.createdAt ? String(role.createdAt) : undefined,
  updatedAt: role?.updatedAt ? String(role.updatedAt) : undefined,
});

export const getRoles = async (): Promise<Role[]> => {
  const { data } = await apiClient.get<RoleListResponse>("/rbac/roles", {
    branchScope: "organization",
  });
  const rawRoles = Array.isArray(data?.data) ? data.data : [];
  return rawRoles.map(mapRoleKeys);
};

export const getRoleById = async (id: string): Promise<Role> => {
  const { data } = await apiClient.get<RoleDetailsResponse>(`/rbac/roles/${id}`, {
    branchScope: "organization",
  });
  return mapRoleKeys(data?.data);
};

export const createRole = async (payload: CreateRolePayload): Promise<Role> => {
  const { data } = await apiClient.post<RoleDetailsResponse>("/rbac/roles", payload, {
    branchScope: "organization",
  });
  return mapRoleKeys(data?.data);
};

export const updateRolePermissions = async (
  id: string,
  payload: UpdateRolePermissionsPayload
): Promise<Role> => {
  const { data } = await apiClient.put<RoleDetailsResponse>(`/rbac/roles/${id}/permissions`, payload, {
    branchScope: "organization",
  });
  return mapRoleKeys(data?.data);
};

export const deleteRole = async (id: string): Promise<void> => {
  await apiClient.delete(`/rbac/roles/${id}`, {
    branchScope: "organization",
  });
};

export const getPermissions = async (
  params: GetPermissionsParams = {}
): Promise<PaginatedPermissionsResult> => {
  const { data } = await apiClient.get<PermissionsListResponse>("/rbac/permissions", {
    params,
    branchScope: "none",
  });

  const rawData = data?.data;
  const mappedData = Array.isArray(rawData)
    ? rawData.map((item: RawPermissionDTO | string) => {
        if (typeof item === "string") {
          return {
            id: item,
            key: item,
            name: item,
            module: item.split(".")[0] || "General",
          };
        }
        return {
          id: item.id || item._id || "",
          key: item.key || item.name || "",
          name: item.name || item.key || "",
          module: item.module || (typeof item.key === "string" ? item.key.split(".")[0] : "General"),
          description: item.description,
        };
      })
    : [];

  const meta = data?.meta || {
    total: mappedData.length,
    page: params.page || 1,
    limit: params.limit || 10,
    totalPages: Math.ceil(mappedData.length / (params.limit || 10)) || 1,
  };

  return {
    data: mappedData,
    meta,
  };
};

export const getPermissionModules = async (): Promise<string[]> => {
  const { data } = await apiClient.get<PermissionModulesResponse>("/rbac/modules", {
    branchScope: "none",
  });
  return Array.isArray(data?.data) ? data.data : [];
};
