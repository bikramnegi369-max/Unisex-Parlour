import { apiClient } from "@/lib/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";
import type { Service, ServicePayload } from "../types/service.types";
import type { ServiceFilters } from "../types/filters.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapIdKey = <T>(item: any): T => {
  if (!item) return item;
  return {
    ...item,
    id: item._id || item.id || "",
    isActive: typeof item.isActive === "boolean" 
      ? item.isActive 
      : item.status === "active" || item.status === undefined,
  } as T;
};

export const getServices = async (params: ServiceFilters = {}): Promise<PaginatedResponse<Service>> => {
  const { data } = await apiClient.get<PaginatedResponse<Service>>("/services", {
    params,
    branchScope: "current",
  });
  return {
    ...data,
    data: (data.data || []).map((s) => mapIdKey<Service>(s)),
  };
};

export const getService = async (id: string): Promise<Service> => {
  const { data } = await apiClient.get<ApiResponse<Service>>(`/services/${id}`, {
    branchScope: "current",
  });
  return mapIdKey(data.data);
};

export const createService = async (payload: ServicePayload): Promise<Service> => {
  const { data } = await apiClient.post<ApiResponse<Service>>("/services", payload, {
    branchScope: "current",
  });
  return mapIdKey(data.data);
};

export const updateService = async (id: string, payload: ServicePayload): Promise<Service> => {
  const { data } = await apiClient.put<ApiResponse<Service>>(`/services/${id}`, payload, {
    branchScope: "current",
  });
  return mapIdKey(data.data);
};

export const updateServiceStatus = async (id: string, isActive: boolean): Promise<Service> => {
  const { data } = await apiClient.patch<ApiResponse<Service>>(`/services/${id}/status`, { isActive }, {
    branchScope: "current",
  });
  return mapIdKey(data.data);
};

export const deleteService = async (id: string): Promise<void> => {
  await apiClient.delete(`/services/${id}`, {
    branchScope: "current",
  });
};

export const reactivateService = async (id: string): Promise<Service> => {
  const { data } = await apiClient.put<ApiResponse<Service>>(`/services/${id}/reactivate`, {}, {
    branchScope: "current",
  });
  return mapIdKey(data.data);
};
