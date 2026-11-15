export type DiscountType = "fixed" | "percentage";
export type CouponStatus = "active" | "inactive";

export interface CouponBranch {
  id: string;
  _id?: string;
  name: string;
}

export interface Coupon {
  id: string;
  _id?: string;
  organizationId: string;
  code: string;
  codeUpper: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  status: CouponStatus;
  isExpired: boolean;
  totalUsageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number | null;
  excludedBranchIds: string[] | CouponBranch[];
  createdBy: string;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CouponPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CouponListResponseData {
  coupons: Coupon[];
  pagination: CouponPaginationMeta;
}

export interface GetCouponsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CouponStatus | "all";
}

export interface CreateCouponPayload {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  status?: CouponStatus;
  totalUsageLimit?: number | null;
  perCustomerLimit?: number | null;
  excludedBranchIds?: string[];
}

export interface UpdateCouponPayload {
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  validFrom?: string;
  validUntil?: string;
  status?: CouponStatus;
  totalUsageLimit?: number | null;
  perCustomerLimit?: number | null;
  excludedBranchIds?: string[];
}

export interface UpdateCouponStatusPayload {
  status: CouponStatus;
}

