import type { Branch, Organization } from "@/types/branch";

export interface CreateBranchPayload {
  name: string;
  address?: string;
  phone?: string;
}

export interface UpdateBranchPayload {
  name?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export interface GetBranchesResponseData {
  organization: Organization;
  branches: Branch[];
}
