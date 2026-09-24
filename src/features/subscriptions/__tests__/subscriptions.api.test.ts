import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api/axios";
import {
  getSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  sendSubscriptionOtp,
  redeemSubscription,
  getSubscriptionUsage,
} from "../api/subscriptions.api";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("Subscriptions API layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSubscriptions", () => {
    it("fetches subscriptions with organization scope (branchScope: none) and normalizes _id to id", async () => {
      const mockRawData = {
        success: true,
        status: "success",
        data: [
          {
            _id: "sub_1",
            subscriptionCode: "SUB-001",
            organizationId: "org_1",
            customerId: "cust_1",
            price: 5000,
            status: "active",
            permittedBranchIds: ["br_1"],
            entitlements: [
              {
                serviceId: "srv_1",
                serviceName: "Haircut",
                totalQuantity: 5,
                usedQuantity: 1,
                remainingQuantity: 4,
              },
            ],
            startDate: "2026-09-01",
            endDate: "2027-03-01",
            createdAt: "2026-09-01T00:00:00Z",
            updatedAt: "2026-09-01T00:00:00Z",
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockRawData });

      const res = await getSubscriptions({ search: "SUB" });

      expect(apiClient.get).toHaveBeenCalledWith("/subscriptions", {
        params: { search: "SUB" },
        branchScope: "none",
      });
      expect(res.data[0].id).toBe("sub_1");
      expect(res.data[0].entitlements[0].remainingQuantity).toBe(4);
    });

    it("sanitizes 'all' from branchId so it is never sent to backend", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { success: true, status: "success", data: [] },
      });

      await getSubscriptions({ branchId: "all", search: "test" });

      expect(apiClient.get).toHaveBeenCalledWith("/subscriptions", {
        params: { search: "test" },
        branchScope: "none",
      });
    });
  });

  describe("getSubscription", () => {
    it("fetches single subscription with organization scope", async () => {
      const mockSub = {
        _id: "sub_123",
        subscriptionCode: "SUB-123",
        organizationId: "org_1",
        customerId: "cust_1",
        price: 3000,
        status: "active",
        permittedBranchIds: [],
        entitlements: [],
        startDate: "2026-09-01",
        endDate: "2027-03-01",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { success: true, status: "success", data: mockSub },
      });

      const res = await getSubscription("sub_123");

      expect(apiClient.get).toHaveBeenCalledWith("/subscriptions/sub_123", {
        branchScope: "none",
      });
      expect(res.id).toBe("sub_123");
    });
  });

  describe("createSubscription", () => {
    it("calls POST /subscriptions with organization scope and sanitizes permittedBranchIds", async () => {
      const payload = {
        customerId: "cust_1",
        price: 2500,
        entitlements: [{ serviceId: "srv_1", quantity: 3 }],
        permittedBranchIds: ["br_1", "all", ""],
        startDate: "2026-09-01",
        endDate: "2027-03-01",
        notes: "Vip client",
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: { _id: "new_sub_1", ...payload, permittedBranchIds: ["br_1"] },
        },
      });

      const res = await createSubscription(payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        "/subscriptions",
        {
          customerId: "cust_1",
          price: 2500,
          entitlements: [{ serviceId: "srv_1", quantity: 3 }],
          permittedBranchIds: ["br_1"],
          startDate: "2026-09-01",
          endDate: "2027-03-01",
          notes: "Vip client",
        },
        { branchScope: "none" }
      );
      expect(res.id).toBe("new_sub_1");
    });
  });

  describe("updateSubscription", () => {
    it("calls PUT /subscriptions/:id with organization scope", async () => {
      const payload = {
        permittedBranchIds: ["br_2"],
        endDate: "2027-06-01",
        notes: "Extended validity",
      };

      vi.mocked(apiClient.put).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: { _id: "sub_1", ...payload },
        },
      });

      const res = await updateSubscription("sub_1", payload);

      expect(apiClient.put).toHaveBeenCalledWith(
        "/subscriptions/sub_1",
        payload,
        { branchScope: "none" }
      );
      expect(res.id).toBe("sub_1");
    });
  });

  describe("cancelSubscription", () => {
    it("calls PATCH /subscriptions/:id/cancel with reason and organization scope", async () => {
      const payload = { reason: "Customer relocated" };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: { _id: "sub_1", status: "cancelled" },
        },
      });

      const res = await cancelSubscription("sub_1", payload);

      expect(apiClient.patch).toHaveBeenCalledWith(
        "/subscriptions/sub_1/cancel",
        payload,
        { branchScope: "none" }
      );
      expect(res.status).toBe("cancelled");
    });
  });

  describe("sendSubscriptionOtp", () => {
    it("calls POST /subscriptions/:id/send-otp with current branch scope", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { success: true, status: "success", data: { message: "OTP sent" } },
      });

      const res = await sendSubscriptionOtp("sub_1");

      expect(apiClient.post).toHaveBeenCalledWith(
        "/subscriptions/sub_1/send-otp",
        {},
        { branchScope: "current" }
      );
      expect(res.message).toBe("OTP sent");
    });
  });

  describe("redeemSubscription", () => {
    it("calls POST /subscriptions/:id/redeem with current branch scope and payload", async () => {
      const redeemPayload = {
        otp: "123456",
        services: [{ serviceId: "srv_1", quantity: 1 }],
        appointmentId: "apt_999",
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: {
            subscription: { _id: "sub_1", status: "active", entitlements: [] },
            usageRecords: [
              {
                _id: "usage_1",
                subscriptionId: "sub_1",
                serviceId: "srv_1",
                quantity: 1,
                branchId: "br_1",
                appointmentId: "apt_999",
                redeemedAt: "2026-09-23T10:00:00Z",
              },
            ],
          },
        },
      });

      const res = await redeemSubscription("sub_1", redeemPayload);

      expect(apiClient.post).toHaveBeenCalledWith(
        "/subscriptions/sub_1/redeem",
        redeemPayload,
        { branchScope: "current" }
      );
      expect(res.subscription.id).toBe("sub_1");
      expect(res.usageRecords[0].id).toBe("usage_1");
    });
  });

  describe("getSubscriptionUsage", () => {
    it("calls GET /subscriptions/:id/usage with organization scope", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: [
            {
              _id: "usage_1",
              subscriptionId: "sub_1",
              serviceId: "srv_1",
              quantity: 1,
              branchId: "br_1",
              redeemedAt: "2026-09-23T10:00:00Z",
            },
          ],
        },
      });

      const res = await getSubscriptionUsage("sub_1", { page: 1, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith("/subscriptions/sub_1/usage", {
        params: { page: 1, limit: 10 },
        branchScope: "none",
      });
      expect(res.data[0].id).toBe("usage_1");
    });
  });
});
