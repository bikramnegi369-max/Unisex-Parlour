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

export interface RawEmployeeDTO extends Partial<Employee> {
  _id?: string;
  id?: string;
}

const mapEmployeeKeys = (emp: RawEmployeeDTO): Employee => ({
  ...(emp as Employee),
  id: emp._id || emp.id || "",
});

export const getEmployees = async (params: GetEmployeesParams = {}): Promise<PaginatedResponse<Employee>> => {
  const branchScope =
    params.branchId && params.branchId !== "all"
      ? ({ type: "branch", branchId: params.branchId } as const)
      : "current";

  const { data } = await apiClient.get<EmployeeListResponse>("/staff", {
    params,
    branchScope,
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
  const { data } = await apiClient.put<EmployeeMutateResponse>(`/staff/${id}`, payload, {
    branchScope: "current",
  });
  return mapEmployeeKeys(data.data);
};

export const restoreEmployee = async (id: string): Promise<Employee> => {
  const { data } = await apiClient.post<EmployeeMutateResponse>(`/staff/${id}/restore`, {}, {
    branchScope: "current",
  });
  return mapEmployeeKeys(data.data);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await apiClient.delete(`/staff/${id}`, {
    branchScope: "current",
  });
};

// --- Relationship Endpoints ---

export const getStaffBranches = async (id: string): Promise<StaffBranch[]> => {
  const { data } = await apiClient.get<StaffBranchListResponse>(`/staff/${id}/branches`, {
    branchScope: "current",
  });
  return data.data || [];
};

export const getStaffServices = async (id: string): Promise<StaffService[]> => {
  const { data } = await apiClient.get<StaffServiceListResponse>(`/staff/${id}/services`, {
    branchScope: "current",
  });
  return data.data || [];
};

export const assignStaffBranch = async (
  id: string,
  payload: { branchId: string; isPrimary?: boolean }
): Promise<StaffBranch> => {
  const { data } = await apiClient.post<{ data: StaffBranch }>(`/staff/${id}/branches`, payload, {
    branchScope: "current",
  });
  return data.data;
};

export const removeStaffBranch = async (id: string, branchId: string): Promise<void> => {
  await apiClient.delete(`/staff/${id}/branches/${branchId}`, {
    branchScope: "current",
  });
};

export const assignStaffService = async (
  id: string,
  payload: { serviceId: string }
): Promise<StaffService> => {
  const { data } = await apiClient.post<{ data: StaffService }>(`/staff/${id}/services`, payload, {
    branchScope: "current",
  });
  return data.data;
};

export const removeStaffService = async (id: string, serviceId: string): Promise<void> => {
  await apiClient.delete(`/staff/${id}/services/${serviceId}`, {
    branchScope: "current",
  });
};

export const linkUserAccount = async (id: string, userId: string): Promise<{ id: string }> => {
  await apiClient.post(`/staff/${id}/user`, { userId }, {
    branchScope: "current",
  });
  return { id };
};

export const unlinkUserAccount = async (id: string): Promise<{ id: string }> => {
  await apiClient.delete(`/staff/${id}/user`, {
    branchScope: "current",
  });
  return { id };
};

// --- Staff Roster / Shift Scheduling ---

export interface ShiftTime {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface DaySchedule {
  dayOfWeek: number; // 0=Sunday, 1=Monday ... 6=Saturday
  isWorkingDay: boolean;
  shifts: ShiftTime[];
}

export interface DateOverride {
  date: string; // "YYYY-MM-DD"
  isWorkingDay: boolean;
  reason?: string;
  shifts: ShiftTime[];
}

export interface StaffRoster {
  id?: string;
  _id?: string;
  organizationId: string;
  branchId: string;
  staffId: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  weeklySchedule: DaySchedule[];
  overrides: DateOverride[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateStaffRosterPayload {
  branchId: string;
  weeklySchedule?: DaySchedule[];
  overrides?: DateOverride[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export const getStaffRoster = async (
  staffId: string,
  branchId: string
): Promise<StaffRoster | null> => {
  const { data } = await apiClient.get<{ success: boolean; data: StaffRoster | null }>(
    `/staff/${staffId}/roster`,
    {
      params: { branchId },
      branchScope: { type: "branch", branchId },
    }
  );
  return data.data;
};

export const updateStaffRoster = async (
  staffId: string,
  payload: UpdateStaffRosterPayload
): Promise<StaffRoster> => {
  const { data } = await apiClient.put<{ success: boolean; data: StaffRoster }>(
    `/staff/${staffId}/roster`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return data.data;
};
