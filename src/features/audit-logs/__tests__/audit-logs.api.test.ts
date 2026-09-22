import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAuditLogs, normalizeAuditLog } from "../api/auditLogs.api";
import { apiClient } from "@/lib/api/axios";
import type { RawAuditLogDTO } from "../types/auditLog.types";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("Audit Logs API Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeAuditLog", () => {
    it("normalizes a raw DTO with _id to id and extracts actor object", () => {
      const raw: RawAuditLogDTO = {
        _id: "log_123",
        organizationId: "org_1",
        branchId: "branch_1",
        actorId: {
          _id: "user_456",
          name: "Alice Owner",
          email: "alice@example.com",
        },
        action: "CUSTOMER_CREATED",
        entityType: "Customer",
        entityId: "cust_789",
        description: "Created customer Alice Smith",
        metadata: { source: "walk_in" },
        createdAt: "2026-09-20T14:00:00.000Z",
      };

      const normalized = normalizeAuditLog(raw);

      expect(normalized.id).toBe("log_123");
      expect(normalized.organizationId).toBe("org_1");
      expect(normalized.branchId).toBe("branch_1");
      expect(normalized.actor).toEqual({
        id: "user_456",
        name: "Alice Owner",
        email: "alice@example.com",
      });
      expect(normalized.action).toBe("CUSTOMER_CREATED");
      expect(normalized.entityType).toBe("Customer");
      expect(normalized.entityId).toBe("cust_789");
      expect(normalized.description).toBe("Created customer Alice Smith");
      expect(normalized.metadata).toEqual({ source: "walk_in" });
      expect(normalized.createdAt).toBe("2026-09-20T14:00:00.000Z");
    });

    it("handles actorId when returned as a raw string ID or missing", () => {
      const rawWithStringActor: RawAuditLogDTO = {
        _id: "log_999",
        actorId: "usr_string_id",
        action: "STAFF_UPDATED",
        entityType: "Staff",
      };

      const normalized = normalizeAuditLog(rawWithStringActor);
      expect(normalized.actor).toEqual({
        id: "usr_string_id",
        name: "User",
      });

      const rawWithNoActor: RawAuditLogDTO = {
        id: "log_000",
        action: "SERVICE_CREATED",
        entityType: "Service",
      };

      const normalized2 = normalizeAuditLog(rawWithNoActor);
      expect(normalized2.actor).toBeNull();
    });
  });

  describe("getAuditLogs", () => {
    it("calls GET /audit-logs with correctly mapped parameters", async () => {
      const mockResponse = {
        data: {
          success: true,
          status: "success",
          message: "Audit logs retrieved successfully",
          data: [
            {
              _id: "log_1",
              action: "CUSTOMER_CREATED",
              entityType: "Customer",
              createdAt: "2026-09-21T10:00:00.000Z",
            },
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const params = {
        page: 2,
        limit: 25,
        sort: "-createdAt",
        branchId: "branch_555",
        entityType: "Customer",
        action: "CUSTOMER_CREATED",
        actorId: "usr_777",
        startDate: "2026-09-01",
        endDate: "2026-09-21",
      };

      const result = await getAuditLogs(params);

      expect(apiClient.get).toHaveBeenCalledWith("/audit-logs", {
        params: {
          page: 2,
          limit: 25,
          sort: "-createdAt",
          branchId: "branch_555",
          entityType: "Customer",
          action: "CUSTOMER_CREATED",
          actorId: "usr_777",
          startDate: "2026-09-01",
          endDate: "2026-09-21",
        },
        branchScope: "none",
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("log_1");
    });

    it("sanitizes 'all' branchId sentinel so it is NEVER sent to the backend", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      });

      await getAuditLogs({
        page: 1,
        branchId: "all",
        entityType: "all",
      });

      expect(apiClient.get).toHaveBeenCalledWith("/audit-logs", {
        params: {
          page: 1,
        },
        branchScope: "none",
      });
    });

    it("omits empty or whitespace-only filter strings", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      });

      await getAuditLogs({
        page: 1,
        action: "   ",
        actorId: "",
      });

      expect(apiClient.get).toHaveBeenCalledWith("/audit-logs", {
        params: {
          page: 1,
        },
        branchScope: "none",
      });
    });
  });
});
