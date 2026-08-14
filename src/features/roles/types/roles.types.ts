export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionItem {
  id?: string;
  key: string;
  name: string;
  module: string;
  description?: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRolePermissionsPayload {
  permissions: string[];
}

export interface GetPermissionsParams {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
}

export interface RoleListResponse {
  success: boolean;
  data: Role[];
}

export interface RoleDetailsResponse {
  success: boolean;
  data: Role;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PermissionsListResponse {
  success: boolean;
  data: PermissionItem[];
  meta?: PaginationMeta;
}

export interface PaginatedPermissionsResult {
  data: PermissionItem[];
  meta: PaginationMeta;
}

export interface PermissionModulesResponse {
  success: boolean;
  message?: string;
  data: string[];
}
