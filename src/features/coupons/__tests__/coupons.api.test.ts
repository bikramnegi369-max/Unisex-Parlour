import { describe, it, expect, vi, beforeEach } from "vitest";
import { couponsApi } from "../api/coupons.api";
import { apiClient } from "@/lib/api/axios";

vi.mock("@/lib/api/axios", () => {
  return {
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe("Coupons API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GET /coupons with branchScope: 'none' and query params", async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          coupons: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
        },
      },
    });

    const params = { page: 1, limit: 10, search: "SUMMER", status: "active" as const };
    await couponsApi.getCoupons(params);

    expect(apiClient.get).toHaveBeenCalledWith("/coupons", {
      params,
      branchScope: "none",
    });
  });

  it("calls GET /coupons/:id with branchScope: 'none'", async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: "coupon-123", code: "WELCOME10" },
      },
    });

    await couponsApi.getCouponById("coupon-123");

    expect(apiClient.get).toHaveBeenCalledWith("/coupons/coupon-123", {
      branchScope: "none",
    });
  });

  it("calls POST /coupons with branchScope: 'none' and payload", async () => {
    const payload = {
      code: "FESTIVE50",
      discountType: "percentage" as const,
      discountValue: 50,
      validFrom: "2026-10-01T00:00:00.000Z",
      validUntil: "2026-10-31T23:59:59.999Z",
    };

    (apiClient.post as any).mockResolvedValueOnce({
      data: { success: true, data: { ...payload, id: "created-id" } },
    });

    await couponsApi.createCoupon(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/coupons", payload, {
      branchScope: "none",
    });
  });

  it("calls PATCH /coupons/:id with branchScope: 'none' and payload", async () => {
    const updatePayload = {
      description: "Updated campaign details",
      validUntil: "2026-11-15T23:59:59.999Z",
    };

    (apiClient.patch as any).mockResolvedValueOnce({
      data: { success: true, data: { id: "coupon-123", ...updatePayload } },
    });

    await couponsApi.updateCoupon("coupon-123", updatePayload);

    expect(apiClient.patch).toHaveBeenCalledWith("/coupons/coupon-123", updatePayload, {
      branchScope: "none",
    });
  });

  it("calls PATCH /coupons/:id/status with branchScope: 'none'", async () => {
    (apiClient.patch as any).mockResolvedValueOnce({
      data: { success: true, data: { id: "coupon-123", status: "inactive" } },
    });

    await couponsApi.updateCouponStatus("coupon-123", { status: "inactive" });

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/coupons/coupon-123/status",
      { status: "inactive" },
      { branchScope: "none" }
    );
  });

  it("calls DELETE /coupons/:id with branchScope: 'none'", async () => {
    (apiClient.delete as any).mockResolvedValueOnce({
      data: { success: true, message: "Coupon deleted successfully" },
    });

    await couponsApi.deleteCoupon("coupon-123");

    expect(apiClient.delete).toHaveBeenCalledWith("/coupons/coupon-123", {
      branchScope: "none",
    });
  });
});
