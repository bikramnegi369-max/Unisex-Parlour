export type EmployeeRole = "Owner" | "Manager" | "Receptionist" | "Stylist" | "Accountant";
export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: string; // maps to _id from Mongoose
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: EmployeeRole;
  branchIds: string[];
  specialties?: string[];
  status: EmployeeStatus;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export type EmployeePayload = Omit<Partial<Employee>, "id" | "organizationId" | "status" | "createdAt" | "updatedAt">;

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
