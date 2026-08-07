import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  Employee,
  EmployeePayload,
  EmployeeListResponse,
  EmployeeDetailsResponse,
  EmployeeMutateResponse,
  EmployeeStatus,
  StaffBranch,
  StaffService,
  StaffBranchListResponse,
  StaffServiceListResponse,
} from "../types/employee.types";

export interface GetEmployeesParams {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  sort?: string;
  branchId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapEmployeeKeys = (emp: any): Employee => ({
  ...emp,
  id: emp._id || emp.id || "",
});

export const getEmployees = async (params: GetEmployeesParams = {}): Promise<PaginatedResponse<Employee>> => {
  const { data } = await apiClient.get<EmployeeListResponse>("/staff", {
    params,
  });

  return {
    ...data,
    data: (data.data || []).map(mapEmployeeKeys),
  };
};

export const getEmployee = async (id: string): Promise<Employee> => {
  const { data } = await apiClient.get<EmployeeDetailsResponse>(`/staff/${id}`);
  return mapEmployeeKeys(data.data);
};

export const createEmployee = async (payload: EmployeePayload): Promise<Employee> => {
  const { data } = await apiClient.post<EmployeeMutateResponse>("/staff", payload);
  return mapEmployeeKeys(data.data);
};

export const updateEmployee = async (id: string, payload: EmployeePayload): Promise<Employee> => {
  const { data } = await apiClient.put<EmployeeMutateResponse>(`/staff/${id}`, payload);
  return mapEmployeeKeys(data.data);
};

export const updateEmployeeStatus = async (id: string, status: EmployeeStatus, currentEmployee: Employee): Promise<Employee> => {
  const payload: EmployeePayload = {
    name: currentEmployee.name,
    email: currentEmployee.email,
    phone: currentEmployee.phone,
    designation: currentEmployee.designation,
    joiningDate: currentEmployee.joiningDate,
    avatarUrl: currentEmployee.avatarUrl,
    status,
  };
  const { data } = await apiClient.put<EmployeeMutateResponse>(`/staff/${id}`, payload);
  return mapEmployeeKeys(data.data);
};

export const restoreEmployee = async (id: string): Promise<Employee> => {
  const { data } = await apiClient.post<EmployeeMutateResponse>(`/staff/${id}/restore`);
  return mapEmployeeKeys(data.data);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await apiClient.delete(`/staff/${id}`);
};

// --- Relationship Endpoints ---

export const getStaffBranches = async (id: string): Promise<StaffBranch[]> => {
  const { data } = await apiClient.get<StaffBranchListResponse>(`/staff/${id}/branches`);
  return data.data || [];
};

export const getStaffServices = async (id: string): Promise<StaffService[]> => {
  const { data } = await apiClient.get<StaffServiceListResponse>(`/staff/${id}/services`);
  return data.data || [];
};

export const assignStaffBranch = async (
  id: string,
  payload: { branchId: string; isPrimary?: boolean }
): Promise<StaffBranch> => {
  const { data } = await apiClient.post<{ data: StaffBranch }>(`/staff/${id}/branches`, payload);
  return data.data;
};

export const removeStaffBranch = async (id: string, branchId: string): Promise<void> => {
  await apiClient.delete(`/staff/${id}/branches/${branchId}`);
};

export const assignStaffService = async (
  id: string,
  payload: { serviceId: string }
): Promise<StaffService> => {
  const { data } = await apiClient.post<{ data: StaffService }>(`/staff/${id}/services`, payload);
  return data.data;
};

export const removeStaffService = async (id: string, serviceId: string): Promise<void> => {
  await apiClient.delete(`/staff/${id}/services/${serviceId}`);
};

export const linkUserAccount = async (id: string, userId: string): Promise<{ id: string }> => {
  await apiClient.post(`/staff/${id}/user`, { userId });
  return { id };
};

export const unlinkUserAccount = async (id: string): Promise<{ id: string }> => {
  await apiClient.delete(`/staff/${id}/user`);
  return { id };
};
