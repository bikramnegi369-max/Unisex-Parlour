import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  AuditLog,
  RawAuditLogDTO,
  GetAuditLogsParams,
  AuditLogListResponse,
} from "../types/auditLog.types";

export const normalizeAuditLog = (raw: RawAuditLogDTO): AuditLog => {
  let actor = null;
  if (raw.actorId && typeof raw.actorId === "object") {
    actor = {
      id: raw.actorId.id || raw.actorId._id || "",
      name: raw.actorId.name || "System User",
      email: raw.actorId.email,
    };
  } else if (typeof raw.actorId === "string" && raw.actorId) {
    actor = {
      id: raw.actorId,
      name: "User",
    };
  }

  return {
    id: raw.id || raw._id || "",
    organizationId: raw.organizationId || "",
    branchId: raw.branchId,
    actor,
    action: raw.action || "UNKNOWN_ACTION",
    entityType: raw.entityType || "Unknown",
    entityId: raw.entityId,
    description: raw.description || "",
    metadata: raw.metadata,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
};

export const getAuditLogs = async (
  params: GetAuditLogsParams = {}
): Promise<PaginatedResponse<AuditLog>> => {
  // Clean up params: omit empty strings and sanitize "all" branchId sentinel
  const cleanParams: Record<string, string | number> = {};

  if (params.page !== undefined && params.page !== null) {
    cleanParams.page = params.page;
  }
  if (params.limit !== undefined && params.limit !== null) {
    cleanParams.limit = params.limit;
  }
  if (params.sort) {
    cleanParams.sort = params.sort;
  }
  if (params.branchId && params.branchId !== "all") {
    cleanParams.branchId = params.branchId;
  }
  if (params.entityType && params.entityType !== "all") {
    cleanParams.entityType = params.entityType;
  }
  if (params.action && params.action.trim()) {
    cleanParams.action = params.action.trim();
  }
  if (params.actorId && params.actorId !== "all" && params.actorId.trim()) {
    cleanParams.actorId = params.actorId.trim();
  }
  if (params.startDate) {
    cleanParams.startDate = params.startDate;
  }
  if (params.endDate) {
    cleanParams.endDate = params.endDate;
  }

  const { data } = await apiClient.get<AuditLogListResponse>("/audit-logs", {
    params: cleanParams,
    branchScope: "none", // Query parameter branchId drives branch filtering cleanly
  });

  return {
    ...data,
    data: (data.data || []).map(normalizeAuditLog),
  };
};
