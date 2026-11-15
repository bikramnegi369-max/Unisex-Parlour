"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { couponsApi } from "../api/coupons.api";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type {
  GetCouponsParams,
  CreateCouponPayload,
  UpdateCouponPayload,
  UpdateCouponStatusPayload,
} from "../types/coupon.types";

export const COUPONS_QUERY_KEY = "coupons";

/**
 * Hook to retrieve paginated and filtered coupons list.
 * Coupons are organization-scoped (no branch filter).
 */
export function useCoupons(params?: GetCouponsParams) {
  const queryKey = getScopeQueryKey(COUPONS_QUERY_KEY, null, [params]);

  return useQuery({
    queryKey,
    queryFn: () => couponsApi.getCoupons(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to retrieve a single coupon by ID.
 */
export function useCoupon(id: string | null | undefined) {
  return useQuery({
    queryKey: [COUPONS_QUERY_KEY, id],
    queryFn: () => couponsApi.getCouponById(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to create a new coupon.
 */
export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCouponPayload) => couponsApi.createCoupon(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COUPONS_QUERY_KEY] });
    },
  });
}

/**
 * Hook to update an existing coupon.
 */
export function useUpdateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCouponPayload }) =>
      couponsApi.updateCoupon(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [COUPONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [COUPONS_QUERY_KEY, variables.id] });
    },
  });
}

/**
 * Hook to update coupon status (active/inactive).
 */
export function useUpdateCouponStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCouponStatusPayload }) =>
      couponsApi.updateCouponStatus(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [COUPONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [COUPONS_QUERY_KEY, variables.id] });
    },
  });
}

/**
 * Hook to soft-delete a coupon.
 */
export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => couponsApi.deleteCoupon(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [COUPONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [COUPONS_QUERY_KEY, id] });
    },
  });
}

