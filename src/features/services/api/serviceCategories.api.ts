import { apiClient } from "@/lib/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";
import type { ServiceCategory, ServiceCategoryPayload } from "../types/category.types";
import type { ServiceCategoryFilters } from "../types/filters.types";

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

export const getServiceCategories = async (params: ServiceCategoryFilters = {}): Promise<PaginatedResponse<ServiceCategory>> => {
  const { data } = await apiClient.get<PaginatedResponse<ServiceCategory>>("/services/categories", {
    params,
    branchScope: "current",
  });
  return {
    ...data,
    data: (data.data || []).map((c) => mapIdKey<ServiceCategory>(c)),
  };
};

export const getServiceCategory = async (id: string): Promise<ServiceCategory> => {
  const { data } = await apiClient.get<ApiResponse<ServiceCategory>>(`/services/categories/${id}`, {
    branchScope: "current",
  });
  return mapIdKey(data.data);
};

export const createServiceCategory = async (payload: ServiceCategoryPayload): Promise<ServiceCategory> => {
  const { data } = await apiClient.post<ApiResponse<ServiceCategory>>("/services/categories", payload, {
    branchScope: "current",
  });
  return mapIdKey(data.data);
};

export const updateServiceCategory = async (id: string, payload: ServiceCategoryPayload): Promise<ServiceCategory> => {
  const { data } = await apiClient.put<ApiResponse<ServiceCategory>>(`/services/categories/${id}`, payload, {
    branchScope: "current",
  });
  return mapIdKey(data.data);
};

export const deleteServiceCategory = async (id: string): Promise<void> => {
  await apiClient.delete(`/services/categories/${id}`, {
    branchScope: "current",
  });
};

export const reactivateServiceCategory = async (id: string): Promise<ServiceCategory> => {
  const { data } = await apiClient.put<ApiResponse<ServiceCategory>>(`/services/categories/${id}/reactivate`, {}, {
    branchScope: "current",
  });
  return mapIdKey(data.data);
};
