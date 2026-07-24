/**
 * Branches API Service
 *
 * API CONTRACT — endpoints are not yet confirmed from the Express backend.
 * Replace the URL strings and response mapping here when the backend is ready.
 * All other code in the app depends on the return types, not these URLs.
 */

import { apiClient } from "@/lib/api/axios";
import type { Branch, Organization } from "@/types/branch";

// ---------------------------------------------------------------------------
// Response shape assumptions (adapt to real backend contract)
// ---------------------------------------------------------------------------

interface GetBranchesResponse {
  success: boolean;
  data: {
    organization: Organization;
    branches: Branch[];
  };
}

interface GetBranchResponse {
  success: boolean;
  data: Branch;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch all branches the authenticated user is authorized to access,
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
