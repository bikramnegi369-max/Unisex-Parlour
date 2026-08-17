/**
 * Branches API Service
 *
 * Authoritative Backend Contract: /api/v1/branches
 * Branch Management is ORGANIZATION-SCOPED.
 * Operations do NOT send branchScope: "current" or X-Branch-Id headers.
 */

import { apiClient } from "@/lib/api/axios";
import type { Branch, Organization } from "@/types/branch";
import type { CreateBranchPayload, UpdateBranchPayload } from "../types/branch.types";

interface GetBranchesResponse {
  success: boolean;
  status: string;
  message: string;
  data: {
    organization: Organization;
    branches: Branch[];
  };
  meta: null;
}

interface GetBranchResponse {
  success: boolean;
  status?: string;
  message?: string;
  data: Branch;
}

interface DeleteBranchResponse {
  success: boolean;
  status?: string;
  message?: string;
  data: null;
}

/**
 * Fetch all active branches the authenticated user is authorized to access,
 * along with the organization context.
 *
 * API CONTRACT: GET /branches
 */
export async function getBranches(): Promise<{ organization: Organization; branches: Branch[] }> {
  const { data } = await apiClient.get<GetBranchesResponse>("/branches");
  return data.data;
}

/**
 * Fetch a single branch by ID.
 *
 * API CONTRACT: GET /branches/:id
 */
export async function getBranch(branchId: string): Promise<Branch> {
  const { data } = await apiClient.get<GetBranchResponse>(`/branches/${branchId}`);
  return data.data;
}

/**
 * Create a new branch within the organization.
 *
 * API CONTRACT: POST /branches
 * Permission: branches.create
 */
export async function createBranch(payload: CreateBranchPayload): Promise<Branch> {
  const { data } = await apiClient.post<GetBranchResponse>("/branches", payload);
  return data.data;
}

/**
 * Update an existing branch.
 *
 * API CONTRACT: PATCH /branches/:id
 * Permission: branches.update
 */
export async function updateBranch(branchId: string, payload: UpdateBranchPayload): Promise<Branch> {
  const { data } = await apiClient.patch<GetBranchResponse>(`/branches/${branchId}`, payload);
  return data.data;
}

/**
 * Soft deactivate a branch.
 *
 * API CONTRACT: DELETE /branches/:id
 * Permission: branches.delete
 * Backend sets isActive = false. Response data is null.
 */
export async function deleteBranch(branchId: string): Promise<null> {
  const { data } = await apiClient.delete<DeleteBranchResponse>(`/branches/${branchId}`);
  return data.data;
}
