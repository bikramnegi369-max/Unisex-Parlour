export interface AuditLogActor {
  id: string;
  name: string;
  email?: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  branchId?: string;
  actor: AuditLogActor | null;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RawAuditLogDTO {
  _id?: string;
  id?: string;
  organizationId?: string;
  branchId?: string;
  actorId?:
    | {
        _id?: string;
        id?: string;
        name?: string;
        email?: string;
      }
    | string
    | null;
  action?: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  sort?: string;
  branchId?: string;
  entityType?: string;
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogListResponse {
  success: boolean;
  status: string;
  message?: string;
  data: RawAuditLogDTO[];
  meta?: {
    total: number;
    page: string | number;
    limit: string | number;
    totalPages: number;
  };
}

export const KNOWN_ENTITY_TYPES = [
  "Customer",
  "CustomerNote",
  "Service",
  "Staff",
  "Leave",
  "User",
  "Role",
  "Branch",
  "Appointment",
] as const;

export type KnownEntityType = (typeof KNOWN_ENTITY_TYPES)[number];
