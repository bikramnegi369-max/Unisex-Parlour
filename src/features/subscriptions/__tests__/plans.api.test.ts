import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api/axios";
import { subscriptionPlansApi } from "../api/plans.api";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Subscription Plans API layer (No Mock/Fallback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPlans", () => {
    it("successfully fetches plans with branchScope none and normalizes _id to id", async () => {
      const mockRawData = {
        success: true,
        data: [
          {
            _id: "plan_1",
            name: "Gold Grooming Pass",
            suggestedPrice: 5000,
            validityMonths: 6,
            entitlements: [{ serviceId: "srv_1", quantity: 5 }],
            isActive: true,
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockRawData });

      const res = await subscriptionPlansApi.getPlans();

      expect(apiClient.get).toHaveBeenCalledWith("/subscription-plans", {
        params: undefined,
        branchScope: "none",
      });
      expect(res.data[0].id).toBe("plan_1");
      expect(res.data[0].name).toBe("Gold Grooming Pass");
    });

    it("surfaces real backend error when API call fails and does NOT fallback to localStorage or mock org_default", async () => {
      const backendError = new Error("Network Error: 500 Internal Server Error");
      vi.mocked(apiClient.get).mockRejectedValueOnce(backendError);

      await expect(subscriptionPlansApi.getPlans()).rejects.toThrow(
        "Network Error: 500 Internal Server Error",
      );

      // Verify no synthetic plan or success response was fabricated
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPlanById", () => {
    it("surfaces real error on backend failure", async () => {
      const notFoundError = new Error("Plan not found");
      vi.mocked(apiClient.get).mockRejectedValueOnce(notFoundError);

      await expect(subscriptionPlansApi.getPlanById("non_existent")).rejects.toThrow("Plan not found");
    });
  });

  describe("createPlan", () => {
    it("surfaces real error on backend failure", async () => {
      const duplicateError = new Error("Plan code already exists");
      vi.mocked(apiClient.post).mockRejectedValueOnce(duplicateError);

      await expect(
        subscriptionPlansApi.createPlan({
          name: "Duplicate Plan",
          suggestedPrice: 1000,
          validityMonths: 1,
          entitlements: [],
        }),
      ).rejects.toThrow("Plan code already exists");
    });
  });

  describe("updatePlan", () => {
    it("surfaces real error on backend failure", async () => {
      const updateError = new Error("Forbidden update");
      vi.mocked(apiClient.put).mockRejectedValueOnce(updateError);

      await expect(
        subscriptionPlansApi.updatePlan("plan_1", { name: "New Name" }),
      ).rejects.toThrow("Forbidden update");
    });
  });

  describe("deletePlan", () => {
    it("surfaces real error on backend failure", async () => {
      const deleteError = new Error("Cannot delete active plan");
      vi.mocked(apiClient.delete).mockRejectedValueOnce(deleteError);

      await expect(subscriptionPlansApi.deletePlan("plan_1")).rejects.toThrow(
        "Cannot delete active plan",
      );
    });
  });
});
