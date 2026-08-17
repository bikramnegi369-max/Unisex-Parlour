import { apiClient } from "@/lib/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";
import type { Service, ServicePayload } from "../types/service.types";
import type { ServiceFilters } from "../types/filters.types";

export interface RawServiceDTO {
  _id?: string;
  id?: string;
  name?: string;
  serviceCode?: string;
  code?: string;
  description?: string;
  categoryId?: string | { _id?: string; name?: string; id?: string };
  duration?: number;
  pricing?: {
    basePrice?: number;
    specialPrice?: number;
  };
  basePrice?: number;
  taxConfiguration?: {
    taxable?: boolean;
    taxRate?: number;
  };
  taxable?: boolean;
  taxRate?: number;
  status?: "active" | "inactive" | string;
  isActive?: boolean;
  isDeleted?: boolean;
  displayOrder?: number;
  branchId?: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const mapServiceDTO = (item: RawServiceDTO | null | undefined): Service => {
  if (!item) return item as unknown as Service;

  const catId =
    typeof item.categoryId === "object" && item.categoryId !== null
      ? (item.categoryId as { _id?: string; id?: string })._id ||
        (item.categoryId as { _id?: string; id?: string }).id ||
        ""
      : item.categoryId || "";

  const basePrice = item.pricing?.basePrice ?? item.basePrice ?? 0;
  const taxable =
    item.taxConfiguration?.taxable ??
    (typeof item.taxable === "boolean" ? item.taxable : false);
  const taxRate =
    item.taxConfiguration?.taxRate ??
    (typeof item.taxRate === "number" ? item.taxRate : 0);
  const isActive =
    typeof item.isActive === "boolean"
      ? item.isActive
      : item.status === "active" || item.status === undefined;

  return {
    id: item._id || item.id || "",
    name: item.name || "",
    code: item.serviceCode || item.code || "",
    description: item.description,
    categoryId: catId,
    duration: item.duration ?? 0,
    pricing: {
      basePrice,
      specialPrice: item.pricing?.specialPrice,
    },
    basePrice,
    taxable,
    taxRate,
    displayOrder: item.displayOrder ?? 0,
    isActive,
    branchId: item.branchId || "",
    organizationId: item.organizationId || "",
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
  };
};

// Keep mapIdKey as alias for mapServiceDTO for compatibility
export const mapIdKey = mapServiceDTO;

export const getServices = async (
  params: ServiceFilters = {},
): Promise<PaginatedResponse<Service>> => {
  const { data } = await apiClient.get<PaginatedResponse<RawServiceDTO>>("/services", {
    params,
    branchScope: "current",
  });
  return {
    ...data,
    data: (data.data || []).map((s) => mapServiceDTO(s)),
  };
};

export const getService = async (id: string): Promise<Service> => {
  const { data } = await apiClient.get<ApiResponse<RawServiceDTO>>(`/services/${id}`, {
    branchScope: "current",
  });
  return mapServiceDTO(data.data);
};

export const createService = async (payload: ServicePayload): Promise<Service> => {
  const catId =
    typeof payload.categoryId === "object" && payload.categoryId !== null
      ? (payload.categoryId as { _id?: string; id?: string })._id ||
        (payload.categoryId as { _id?: string; id?: string }).id ||
        ""
      : payload.categoryId || "";

  const basePrice = payload.basePrice ?? payload.pricing?.basePrice ?? 0;
  const taxable = payload.taxable ?? payload.taxConfiguration?.taxable;
  const taxRate = payload.taxRate ?? payload.taxConfiguration?.taxRate;

  const flatPayload: Record<string, unknown> = {
    name: payload.name,
    categoryId: catId,
    duration: payload.duration,
    basePrice,
  };

  if (payload.code || payload.serviceCode) {
    flatPayload.serviceCode = payload.code || payload.serviceCode;
  }
  if (payload.description !== undefined) {
    flatPayload.description = payload.description;
  }
  if (taxable !== undefined) {
    flatPayload.taxable = taxable;
  }
  if (taxRate !== undefined) {
    flatPayload.taxRate = taxRate;
  }
  if (payload.displayOrder !== undefined) {
    flatPayload.displayOrder = payload.displayOrder;
  }

  const { data } = await apiClient.post<ApiResponse<RawServiceDTO>>("/services", flatPayload, {
    branchScope: "current",
  });
  return mapServiceDTO(data.data);
};

export const updateService = async (
  id: string,
  payload: ServicePayload,
): Promise<Service> => {
  const nestedPayload: Record<string, unknown> = {};

  if (payload.name !== undefined) nestedPayload.name = payload.name;
  if (payload.description !== undefined) nestedPayload.description = payload.description;
  if (payload.categoryId !== undefined) {
    nestedPayload.categoryId =
      typeof payload.categoryId === "object" && payload.categoryId !== null
        ? (payload.categoryId as { _id?: string; id?: string })._id ||
          (payload.categoryId as { _id?: string; id?: string }).id
        : payload.categoryId;
  }
  if (payload.duration !== undefined) nestedPayload.duration = payload.duration;
  if (payload.displayOrder !== undefined) nestedPayload.displayOrder = payload.displayOrder;
  if (payload.status !== undefined) nestedPayload.status = payload.status;

  if (payload.pricing?.basePrice !== undefined) {
    nestedPayload.pricing = { basePrice: payload.pricing.basePrice };
  } else if (payload.basePrice !== undefined) {
    nestedPayload.pricing = { basePrice: payload.basePrice };
  }

  const taxConfigObj = (payload as { taxConfiguration?: { taxable?: boolean; taxRate?: number } }).taxConfiguration;

  if (taxConfigObj !== undefined && taxConfigObj !== null) {
    nestedPayload.taxConfiguration = taxConfigObj;
  } else if (payload.taxable !== undefined || payload.taxRate !== undefined) {
    const taxConfig: Record<string, unknown> = {};
    if (payload.taxable !== undefined) {
      taxConfig.taxable = payload.taxable;
    }
    if (payload.taxRate !== undefined) {
      taxConfig.taxRate = payload.taxRate;
    }
    nestedPayload.taxConfiguration = taxConfig;
  }

  const { data } = await apiClient.put<ApiResponse<RawServiceDTO>>(`/services/${id}`, nestedPayload, {
    branchScope: "current",
  });
  return mapServiceDTO(data.data);
};

export const updateServiceStatus = async (
  id: string,
  isActive: boolean,
): Promise<Service> => {
  const { data } = await apiClient.put<ApiResponse<RawServiceDTO>>(
    `/services/${id}`,
    { status: isActive ? "active" : "inactive" },
    { branchScope: "current" },
  );
  return mapServiceDTO(data.data);
};

export const deleteService = async (id: string): Promise<void> => {
  await apiClient.delete(`/services/${id}`, {
    branchScope: "current",
  });
};

export const reactivateService = async (id: string): Promise<Service> => {
  const { data } = await apiClient.patch<ApiResponse<RawServiceDTO>>(
    `/services/${id}/reactivate`,
    {},
    { branchScope: "current" },
  );
  return mapServiceDTO(data.data);
};
