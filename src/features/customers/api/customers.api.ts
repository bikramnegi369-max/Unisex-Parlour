import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  Customer,
  CustomerListResponse,
  CustomerDetailsResponse,
  CustomerMutateResponse,
  CustomerDeleteResponse,
  CustomerNote,
  AuditLog,
  CustomerNotesResponse,
  CustomerNoteMutateResponse,
  CustomerActivityResponse,
} from "../types/customer.types";

export interface GetCustomersParams {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  sort?: string;
}

export interface GetCustomerNotesParams {
  page?: number;
  limit?: number;
}

export interface GetCustomerActivityParams {
  page?: number;
  limit?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapCustomerKeys = (c: any): Customer => ({
  ...c,
  id: c._id || c.id || "",
});

export const getCustomers = async (params: GetCustomersParams = {}): Promise<PaginatedResponse<Customer>> => {
  const { data } = await apiClient.get<CustomerListResponse>("/customers", {
    params,
    branchScope: "current",
  });

  return {
    ...data,
    data: (data.data || []).map(mapCustomerKeys),
  };
};

export const getCustomer = async (id: string): Promise<Customer> => {
  const { data } = await apiClient.get<CustomerDetailsResponse>(`/customers/${id}`, {
    branchScope: "current",
  });
  return mapCustomerKeys(data.data);
};

export const createCustomer = async (payload: Omit<Partial<Customer>, "id" | "organizationId" | "homeBranchId" | "visitedBranchIds" | "isActive">): Promise<Customer> => {
  const { data } = await apiClient.post<CustomerMutateResponse>("/customers", payload, {
    branchScope: "current",
  });
  return mapCustomerKeys(data.data);
};

export const updateCustomer = async (id: string, payload: Omit<Partial<Customer>, "id" | "organizationId" | "homeBranchId" | "visitedBranchIds" | "isActive">): Promise<Customer> => {
  const { data } = await apiClient.put<CustomerMutateResponse>(`/customers/${id}`, payload, {
    branchScope: "current",
  });
  return mapCustomerKeys(data.data);
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await apiClient.delete<CustomerDeleteResponse>(`/customers/${id}`, {
    branchScope: "current",
  });
};

export const reactivateCustomer = async (id: string): Promise<Customer> => {
  const { data } = await apiClient.put<CustomerMutateResponse>(`/customers/${id}/reactivate`, {}, {
    branchScope: "current",
  });
  return mapCustomerKeys(data.data);
};

export const getCustomerNotes = async (
  customerId: string,
  params: GetCustomerNotesParams = {}
): Promise<PaginatedResponse<CustomerNote>> => {
  const { data } = await apiClient.get<CustomerNotesResponse>(`/customers/${customerId}/notes`, {
    params,
    branchScope: "current",
  });

  return {
    ...data,
    data: data.data || [],
  };
};

export const createCustomerNote = async (
  customerId: string,
  payload: { text: string; branchId: string }
): Promise<CustomerNote> => {
  const { data } = await apiClient.post<CustomerNoteMutateResponse>(
    `/customers/${customerId}/notes`,
    {
      text: payload.text,
      branchId: payload.branchId,
    },
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );
  return data.data;
};

interface BackendActivityItem {
  _id: string;
  action: string;
  description: string;
  createdAt?: string;
  date?: string;
  actorId?: string | { _id: string; name: string };
  performedBy?: string | { _id: string; name: string };
}

export const getCustomerActivity = async (
  customerId: string,
  params: GetCustomerActivityParams = {}
): Promise<PaginatedResponse<AuditLog>> => {
  const { data } = await apiClient.get<CustomerActivityResponse>(`/customers/${customerId}/activity`, {
    params,
    branchScope: "current",
  });

  return {
    ...data,
    data: (data.data || []).map((item: BackendActivityItem): AuditLog => ({
      _id: item._id,
      action: item.action,
      description: item.description,
      date: item.createdAt || item.date || "",
      performedBy: item.actorId || item.performedBy || "",
    })),
  };
};


