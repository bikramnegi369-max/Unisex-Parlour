import { apiClient } from "@/lib/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";
import type { ServiceCategory, ServiceCategoryPayload } from "../types/category.types";
import type { ServiceCategoryFilters } from "../types/filters.types";

export interface RawServiceCategoryDTO extends Partial<ServiceCategory> {
  _id?: string;
  id?: string;
  status?: string;
}

const mapIdKey = (item: RawServiceCategoryDTO | null | undefined): ServiceCategory => {
  if (!item) return item as unknown as ServiceCategory;
  return {
    ...(item as ServiceCategory),
    id: item._id || item.id || "",
    isActive: typeof item.isActive === "boolean" 
      ? item.isActive 
      : item.status === "active" || item.status === undefined,
  };
};

export const getServiceCategories = async (params: ServiceCategoryFilters = {}): Promise<PaginatedResponse<ServiceCategory>> => {
  const { data } = await apiClient.get<PaginatedResponse<ServiceCategory>>("/services/categories", {
    params,
    branchScope: "current",
  });
  return {
    ...data,
    data: (data.data || []).map((c) => mapIdKey(c)),
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
