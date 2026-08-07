export type UserStatus = "active" | "inactive" | "suspended" | "locked";

export interface UserBranchAccess {
  branchId: string;
  branchName: string;
  isActive: boolean;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
}

export interface UserResponseDTO {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone: string;
  role: string | UserRole;
  organizationId: string;
  hasOrgWideAccess: boolean;
  branchAccess: UserBranchAccess[];
  isVerified: boolean;
  isFirstLogin: boolean;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  status?: UserStatus;
  role?: string | { id: string; name?: string };
  isVerified?: boolean;
  isFirstLogin?: boolean;
  hasOrgWideAccess?: boolean;
  branchAccess?: UserBranchAccess[] | string[];
  createdAt?: string;
  updatedAt?: string;
}

// Query parameters for GET /users
export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

// Payload for POST /users
export interface CreateUserPayload {
  name: string;
  email: string;
  phone: string;
  roleId: string;
  branchAccess: string[];
}

// Payload for PATCH /users/:id
export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  branchAccess?: string[];
  hasOrgWideAccess?: boolean;
}

// Administrative status update type (excludes system-generated "locked")
export type UpdateUserStatus = "active" | "inactive" | "suspended";

// Auth Login response supporting first-login activation
export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  requireActivation?: boolean;
  activationToken?: string;
}

// Auth Verification OTP response
export interface VerifyActivationOtpResponse {
  message: string;
  passwordChangeToken: string;
}
