export interface Customer {
  id: string; // maps to _id from Mongoose
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  organizationId: string;
  homeBranchId: string;
  visitedBranchIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Customer[];
  meta?: {
    total: number;
    page: string | number;
    limit: string | number;
    totalPages: number;
  };
}

export interface CustomerDetailsResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Customer;
}

export interface CustomerMutateResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Customer;
}

export interface CustomerDeleteResponse {
  success: boolean;
  status: string;
  message?: string;
}
