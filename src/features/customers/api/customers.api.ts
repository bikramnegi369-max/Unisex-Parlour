import { apiClient } from "@/lib/api/axios";
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

export interface NormalizedCustomersData {
  customers: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface GetCustomerNotesParams {
  page?: number;
  limit?: number;
}

export interface NormalizedCustomerNotesData {
  notes: CustomerNote[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface GetCustomerActivityParams {
  page?: number;
  limit?: number;
}

export interface NormalizedCustomerActivityData {
  activities: AuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapCustomerKeys = (c: any): Customer => ({
  ...c,
  id: c._id || c.id || "",
});

export const getCustomers = async (params: GetCustomersParams = {}): Promise<NormalizedCustomersData> => {
  const { data } = await apiClient.get<CustomerListResponse>("/customers", {
    params,
    branchScope: "current",
  });

  const customers = (data.data || []).map(mapCustomerKeys);
  const total = data.meta?.total ?? 0;
  const pageVal = Number(data.meta?.page ?? 1);
  const limitVal = Number(data.meta?.limit ?? 10);
  const pages = data.meta?.totalPages ?? (Math.ceil(total / limitVal) || 1);

  return {
    customers,
    pagination: {
      total,
      page: pageVal,
      limit: limitVal,
      pages,
    },
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
): Promise<NormalizedCustomerNotesData> => {
  const { data } = await apiClient.get<CustomerNotesResponse>(`/customers/${customerId}/notes`, {
    params,
    branchScope: "current",
  });

  const notes = data.data || [];
  const total = data.meta?.total ?? notes.length;
  const pageVal = Number(data.meta?.page ?? 1);
  const limitVal = Number(data.meta?.limit ?? 10);
  const pages = data.meta?.totalPages ?? 1;

  return {
    notes,
    pagination: {
      total,
      page: pageVal,
      limit: limitVal,
      pages,
    },
  };
};

export const createCustomerNote = async (
  customerId: string,
  payload: { text: string }
): Promise<CustomerNote> => {
  const { data } = await apiClient.post<CustomerNoteMutateResponse>(
    `/customers/${customerId}/notes`,
    payload,
    {
      branchScope: "current",
    }
  );
  return data.data;
};

export const getCustomerActivity = async (
  customerId: string,
  params: GetCustomerActivityParams = {}
): Promise<NormalizedCustomerActivityData> => {
  const { data } = await apiClient.get<CustomerActivityResponse>(`/customers/${customerId}/activity`, {
    params,
    branchScope: "current",
  });

  const activities = data.data || [];
  const total = data.meta?.total ?? activities.length;
  const pageVal = Number(data.meta?.page ?? 1);
  const limitVal = Number(data.meta?.limit ?? 10);
  const pages = data.meta?.totalPages ?? 1;

  return {
    activities,
    pagination: {
      total,
      page: pageVal,
      limit: limitVal,
      pages,
    },
  };
};


