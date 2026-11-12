import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api/axios";
import {
  cancelSubscription,
  getCancellationPreview,
  getCancellationOperation,
  retryCancellationOperation,
} from "../api/subscriptions.api";
import type { CancellationOperationData } from "../types/subscription.types";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("Subscription Cancellation & Rebilling API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCancellationPreview", () => {
    it("normalizes backend raw preview contract with isEligibleRuleB, totalUsages, totalRestoredAmount and affectedLines", async () => {
      const backendRawPreview = {
        subscriptionId: "sub_1",
        subscriptionCode: "SUB-001",
        status: "active",
        isEligibleRuleB: true,
        totalCollected: 0,
        totalUsages: 3,
        totalAppointments: 2,
        totalRestoredAmount: 1200,
        blockingInconsistencies: [],
        breakdown: {
          pendingAppointments: 1,
          completedAppointments: 1,
          otherAppointments: 0,
        },
        affectedAppointments: [
          {
            appointmentId: "apt_1",
            appointmentCode: "APT-001",
            status: "completed",
            invoiceId: "inv_1",
            invoiceNumber: "INV-1001",
            currentAmountPaid: 500,
            currentAmountDue: 0,
            affectedLines: [
              {
                usageId: "usg_1",
                appointmentId: "apt_1",
                appointmentCode: "APT-001",
                appointmentStatus: "completed",
                serviceId: "srv_1",
                serviceName: "Haircut",
                restoredPrice: 500,
                appointmentServiceId: "line_1",
              },
            ],
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: backendRawPreview,
        },
      });

      const result = await getCancellationPreview("sub_1");

      expect(result.eligibilityRule).toBe("RULE_B");
      expect(result.isEligible).toBe(true);
      expect(result.consumedEntitlementCount).toBe(3);
      expect(result.affectedAppointmentCount).toBe(2);
      expect(result.expectedRebilledSubtotalIncrease).toBe(1200);
      expect(result.totalRestoredAmount).toBe(1200);
      expect(result.affectedAppointments[0].invoiceNumber).toBe("INV-1001");
      expect(result.affectedAppointments[0].serviceLinesToRebill[0].serviceName).toBe("Haircut");
      expect(result.affectedAppointments[0].serviceLinesToRebill[0].restoredRetailPrice).toBe(500);
      expect(result.affectedAppointments[0].serviceLinesToRebill[0].usageId).toBe("usg_1");
    });

    it("correctly marks ineligibility when backend returns blockingInconsistencies", async () => {
      const backendRawIneligible = {
        subscriptionId: "sub_2",
        subscriptionCode: "SUB-002",
        status: "active",
        isEligibleRuleB: false,
        totalCollected: 5000,
        totalUsages: 2,
        totalAppointments: 1,
        totalRestoredAmount: 800,
        blockingInconsistencies: ["Subscription invoice has partial payment without refund path"],
        affectedAppointments: [],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: backendRawIneligible,
        },
      });

      const result = await getCancellationPreview("sub_2");

      expect(result.isEligible).toBe(false);
      expect(result.ineligibilityReason).toContain("Subscription invoice has partial payment");
      expect(result.blockingInconsistencies).toHaveLength(1);
    });

    it("rule B: usages present but isEligibleRuleB: false must be marked ineligible", async () => {
      const backendRuleBIneligible = {
        subscriptionId: "sub_rule_b_false",
        subscriptionCode: "SUB-B-FALSE",
        status: "active",
        isEligibleRuleB: false,
        totalUsages: 4,
        totalAppointments: 2,
        totalRestoredAmount: 2000,
        blockingInconsistencies: [],
        affectedAppointments: [],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: backendRuleBIneligible,
        },
      });

      const result = await getCancellationPreview("sub_rule_b_false");

      expect(result.eligibilityRule).toBe("RULE_B");
      expect(result.isEligible).toBe(false);
      expect(result.consumedEntitlementCount).toBe(4);
    });

    it("rule B: isEligibleRuleB: true with blockingInconsistencies must disable eligibility", async () => {
      const backendRuleBWithBlockers = {
        subscriptionId: "sub_rule_b_blockers",
        subscriptionCode: "SUB-B-BLOCKERS",
        status: "active",
        isEligibleRuleB: true,
        totalUsages: 2,
        totalAppointments: 1,
        totalRestoredAmount: 1000,
        blockingInconsistencies: [
          "Open reconciliation operation already in progress",
          { message: "Unpaid invoice lines have unsettled disputes" },
        ],
        affectedAppointments: [],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: backendRuleBWithBlockers,
        },
      });

      const result = await getCancellationPreview("sub_rule_b_blockers");

      expect(result.eligibilityRule).toBe("RULE_B");
      expect(result.isEligible).toBe(false);
      expect(result.blockingInconsistencies).toHaveLength(2);
      expect(result.ineligibilityReason).toContain("Open reconciliation");
      expect(result.ineligibilityReason).toContain("Unpaid invoice lines");
    });

    it("handles Rule A preview with totalUsages: 0 when isEligible is true", async () => {
      const backendRuleA = {
        subscriptionId: "sub_3",
        subscriptionCode: "SUB-003",
        status: "active",
        isEligible: true,
        totalCollected: 0,
        totalUsages: 0,
        totalAppointments: 0,
        totalRestoredAmount: 0,
        blockingInconsistencies: [],
        affectedAppointments: [],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: backendRuleA,
        },
      });

      const result = await getCancellationPreview("sub_3");

      expect(result.eligibilityRule).toBe("RULE_A");
      expect(result.isEligible).toBe(true);
      expect(result.consumedEntitlementCount).toBe(0);
      expect(result.affectedAppointmentCount).toBe(0);
      expect(result.expectedRebilledSubtotalIncrease).toBe(0);
    });

    it("fails closed when eligibility fields are missing or malformed", async () => {
      const backendMalformed = {
        subscriptionId: "sub_malformed",
        subscriptionCode: "SUB-MALFORMED",
        status: "active",
        totalUsages: 0,
        // Notice neither isEligible nor isEligibleRuleA is provided
        blockingInconsistencies: [],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: backendMalformed,
        },
      });

      const result = await getCancellationPreview("sub_malformed");

      expect(result.isEligible).toBe(false);
      expect(result.ineligibilityReason).toBeDefined();
    });

    it("normalizes mixed, empty, malformed, and structured blocker arrays safely", async () => {
      const backendBlockersMixed = {
        subscriptionId: "sub_mixed_blockers",
        subscriptionCode: "SUB-MIXED",
        status: "active",
        isEligibleRuleB: true,
        totalUsages: 1,
        blockingInconsistencies: [
          "Direct string blocker",
          { message: "Object with message property" },
          { error: "Object with error property" },
          { reason: "Object with reason property" },
          { code: "ERR_UNSETTLED_INVOICE" },
          { arbitraryField: 12345 },
          "",
          "   ",
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: backendBlockersMixed,
        },
      });

      const result = await getCancellationPreview("sub_mixed_blockers");

      expect(result.isEligible).toBe(false);
      expect(result.blockingInconsistencies).toBeDefined();
      expect(result.blockingInconsistencies).toHaveLength(6);
      expect(result.blockingInconsistencies![0]).toBe("Direct string blocker");
      expect(result.blockingInconsistencies![1]).toBe("Object with message property");
      expect(result.blockingInconsistencies![2]).toBe("Object with error property");
      expect(result.blockingInconsistencies![3]).toBe("Object with reason property");
      expect(result.blockingInconsistencies![4]).toBe("Inconsistency code: ERR_UNSETTLED_INVOICE");
      expect(result.blockingInconsistencies![5]).toContain("arbitraryField");
    });
  });

  describe("cancelSubscription", () => {
    it("submits PATCH /subscriptions/:id/cancel with Idempotency-Key header when provided", async () => {
      const payload = {
        reason: "Customer requested cancellation",
        idempotencyKey: "uuid-1234-abcd",
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          status: "success",
          data: {
            _id: "sub_1",
            status: "cancelled",
          },
        },
      });

      const result = await cancelSubscription("sub_1", payload);

      expect(apiClient.patch).toHaveBeenCalledWith(
        "/subscriptions/sub_1/cancel",
        {
          reason: "Customer requested cancellation",
          idempotencyKey: "uuid-1234-abcd",
        },
        {
          branchScope: "none",
          headers: {
            "Idempotency-Key": "uuid-1234-abcd",
          },
        }
      );
      expect(result.isAsync).toBe(false);
      expect(result.status).toBe("completed");
      expect(result.subscription?.id).toBe("sub_1");
    });

    it("handles HTTP 200 synchronous cancellation returning operation record directly without manufacturing a subscription", async () => {
      const payload = {
        reason: "Customer cancellation",
      };

      // Real Axios Response shape exposed by apiClient with HTTP 200
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} as never },
        data: {
          success: true,
          status: "success",
          data: {
            operationId: "op_sync_123",
            status: "completed",
            totalUsageCount: 2,
            totalAppointmentCount: 1,
            processedUsageCount: 2,
            processedAppointmentCount: 1,
            completedBatchIndexes: [0],
            operationErrors: [],
          },
        },
      });

      const result = await cancelSubscription("sub_1", payload);

      expect(result.isAsync).toBe(false);
      expect(result.operationId).toBe("op_sync_123");
      expect(result.status).toBe("completed");
      expect(result.subscription).toBeUndefined(); // Must NOT manufacture a fake subscription object
      expect(result.operation?.totalUsageCount).toBe(2);
      expect(result.operation?.processedAppointmentCount).toBe(1);
    });

    it("handles HTTP 202 accepted response using the real Axios client status without confusing response body status", async () => {
      const payload = {
        reason: "Large batch rebill",
        forceAsync: true,
      };

      // Response body has status: "success" or "pending", but HTTP status is 202 Accepted
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        status: 202,
        statusText: "Accepted",
        headers: {},
        config: { headers: {} as never },
        data: {
          success: true,
          status: "success", // Notice body says success, but HTTP status is 202
          data: {
            operationId: "op_555",
            status: "processing",
            totalAppointments: 15,
            totalUsages: 20,
          },
        },
      });

      const result = await cancelSubscription("sub_1", payload);

      expect(result.isAsync).toBe(true);
      expect(result.operationId).toBe("op_555");
      expect(result.status).toBe("processing");
      expect(result.subscription).toBeUndefined();
      expect(result.operation?.totalAppointmentCount).toBe(15);
      expect(result.operation?.totalUsageCount).toBe(20);
    });
  });

  describe("getCancellationOperation", () => {
    it("calls GET /subscriptions/:id/cancel/operations/:operationId and extracts top-level counters", async () => {
      const backendOp = {
        operationId: "op_555",
        subscriptionId: "sub_1",
        status: "processing",
        totalUsageCount: 8,
        totalAppointmentCount: 4,
        processedUsageCount: 4,
        processedAppointmentCount: 2,
        completedBatchIndexes: [0],
        operationErrors: [],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: backendOp,
        },
      });

      const result = await getCancellationOperation("sub_1", "op_555");

      expect(apiClient.get).toHaveBeenCalledWith(
        "/subscriptions/sub_1/cancel/operations/op_555",
        { branchScope: "none" }
      );
      expect(result.status).toBe("processing");
      expect(result.totalUsageCount).toBe(8);
      expect(result.totalAppointmentCount).toBe(4);
      expect(result.processedUsageCount).toBe(4);
      expect(result.processedAppointmentCount).toBe(2);
      expect(result.progress?.processedAppointments).toBe(2);
    });

    it("handles safe fallbacks when backend operation returns missing or malformed counters", async () => {
      const backendOpMinimal = {
        operationId: "op_minimal",
        subscriptionId: "sub_1",
        status: "pending",
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: backendOpMinimal,
        },
      });

      const result = await getCancellationOperation("sub_1", "op_minimal");

      expect(result.operationId).toBe("op_minimal");
      expect(result.status).toBe("pending");
      expect(result.totalAppointmentCount).toBeUndefined();
      expect(result.processedAppointmentCount).toBeUndefined();
    });
  });

  describe("retryCancellationOperation", () => {
    it("calls POST /subscriptions/:id/cancel/operations/:operationId/retry", async () => {
      const mockOp: CancellationOperationData = {
        operationId: "op_555",
        subscriptionId: "sub_1",
        status: "pending",
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: mockOp,
        },
      });

      const result = await retryCancellationOperation("sub_1", "op_555");

      expect(apiClient.post).toHaveBeenCalledWith(
        "/subscriptions/sub_1/cancel/operations/op_555/retry",
        {},
        { branchScope: "none" }
      );
      expect(result.status).toBe("pending");
    });
  });
});

