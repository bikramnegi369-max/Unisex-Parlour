import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  Employee,
  EmployeePayload,
  EmployeeListResponse,
  EmployeeDetailsResponse,
  EmployeeMutateResponse,
  EmployeeStatus,
} from "../types/employee.types";

export interface GetEmployeesParams {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
  sortBy?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapEmployeeKeys = (emp: any): Employee => ({
  ...emp,
  id: emp._id || emp.id || "",
});

export const getEmployees = async (params: GetEmployeesParams = {}): Promise<PaginatedResponse<Employee>> => {
  const { data } = await apiClient.get<EmployeeListResponse>("/staff", {
    params,
    branchScope: "current",
  });

  return {
    ...data,
    data: (data.data || []).map(mapEmployeeKeys),
  };
};

export const getEmployee = async (id: string): Promise<Employee> => {
  const { data } = await apiClient.get<EmployeeDetailsResponse>(`/staff/${id}`, {
    branchScope: "current",
  });
  return mapEmployeeKeys(data.data);
};

export const createEmployee = async (payload: EmployeePayload): Promise<Employee> => {
  const { data } = await apiClient.post<EmployeeMutateResponse>("/staff", payload, {
    branchScope: "current",
  });
  return mapEmployeeKeys(data.data);
};

export const updateEmployee = async (id: string, payload: EmployeePayload): Promise<Employee> => {
  const { data } = await apiClient.put<EmployeeMutateResponse>(`/staff/${id}`, payload, {
    branchScope: "current",
  });
  return mapEmployeeKeys(data.data);
};

export const updateEmployeeStatus = async (id: string, status: EmployeeStatus): Promise<Employee> => {
  const { data } = await apiClient.patch<EmployeeMutateResponse>(
    `/staff/${id}/status`,
    { status },
    {
      branchScope: "current",
    }
  );
  return mapEmployeeKeys(data.data);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await apiClient.delete(`/staff/${id}`, {
    branchScope: "current",
  });
};
