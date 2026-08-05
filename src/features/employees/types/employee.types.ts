export type EmployeeStatus = "active" | "inactive" | "suspended";

export interface Employee {
  id: string; // maps to _id from Mongoose
  _id?: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  joiningDate: string;
  avatarUrl?: string | null;
  status: EmployeeStatus;
  staffCode: string;
  organizationId: string;
  userId?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EmployeePayload = Omit<Partial<Employee>, "id" | "organizationId" | "createdAt" | "updatedAt">;

export interface PopulatedBranch {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

export interface StaffBranch {
  _id: string;
  staffId: string;
  branchId: PopulatedBranch;
  organizationId: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PopulatedService {
  _id: string;
  name: string;
  duration: number;
  pricing: {
    basePrice: number;
  };
  status: string;
}

export interface StaffService {
  _id: string;
  staffId: string;
  serviceId: PopulatedService;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Employee[];
  meta?: {
    total: number;
    page: string | number;
    limit: string | number;
    totalPages: number;
  };
}

export interface EmployeeDetailsResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Employee;
}

export interface EmployeeMutateResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Employee;
}

export interface StaffBranchListResponse {
  success: boolean;
  status: string;
  message?: string;
  data: StaffBranch[];
}

export interface StaffServiceListResponse {
  success: boolean;
  status: string;
  message?: string;
  data: StaffService[];
}
