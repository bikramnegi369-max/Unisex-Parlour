import { apiClient } from "@/lib/api/axios";
import type { ApiResponse } from "@/types/api.types";
import type {
  Coupon,
  CouponListResponseData,
  GetCouponsParams,
  CreateCouponPayload,
  UpdateCouponPayload,
  UpdateCouponStatusPayload,
} from "../types/coupon.types";

/**
 * Normalizes backend MongoDB document `_id` to standard frontend `id`.
 */
function normalizeCoupon(raw: Coupon): Coupon {
  const id = raw.id || raw._id || "";
  return {
    ...raw,
    id,
  };
}

export const couponsApi = {
  /**
   * List coupons with organization scope (no X-Branch-Id header)
   */
  getCoupons: async (params?: GetCouponsParams): Promise<ApiResponse<CouponListResponseData>> => {
    const response = await apiClient.get<ApiResponse<CouponListResponseData>>("/coupons", {
      params,
      branchScope: "none",
    });

    const data = response.data.data;
    return {
      ...response.data,
      data: {
        coupons: (data?.coupons || []).map(normalizeCoupon),
        pagination: data?.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    };
  },

  /**
   * Get single coupon details by ID
   */
  getCouponById: async (id: string): Promise<ApiResponse<Coupon>> => {
    const response = await apiClient.get<ApiResponse<Coupon>>(`/coupons/${id}`, {
      branchScope: "none",
    });

    return {
      ...response.data,
      data: normalizeCoupon(response.data.data),
    };
  },

  /**
   * Create a new coupon campaign
   */
  createCoupon: async (payload: CreateCouponPayload): Promise<ApiResponse<Coupon>> => {
    const response = await apiClient.post<ApiResponse<Coupon>>("/coupons", payload, {
      branchScope: "none",
    });

    return {
      ...response.data,
      data: normalizeCoupon(response.data.data),
    };
  },

  /**
   * Update an existing coupon campaign
   */
  updateCoupon: async (id: string, payload: UpdateCouponPayload): Promise<ApiResponse<Coupon>> => {
    const response = await apiClient.patch<ApiResponse<Coupon>>(`/coupons/${id}`, payload, {
      branchScope: "none",
    });

    return {
      ...response.data,
      data: normalizeCoupon(response.data.data),
    };
  },

  /**
   * Update coupon administrative status (active / inactive)
   */
  updateCouponStatus: async (
    id: string,
    payload: UpdateCouponStatusPayload
  ): Promise<ApiResponse<Coupon>> => {
    const response = await apiClient.patch<ApiResponse<Coupon>>(`/coupons/${id}/status`, payload, {
      branchScope: "none",
    });

    return {
      ...response.data,
      data: normalizeCoupon(response.data.data),
    };
  },

  /**
   * Soft-delete a coupon
   */
  deleteCoupon: async (id: string): Promise<ApiResponse<{ id: string; message: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string; message: string }>>(
      `/coupons/${id}`,
      {
        branchScope: "none",
      }
    );

    return response.data;
  },
};

