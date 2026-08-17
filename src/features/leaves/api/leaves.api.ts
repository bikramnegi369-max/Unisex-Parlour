import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  Leave,
  LeaveStatus,
  LeaveListQuery,
  CreateLeavePayload,
  UpdateLeavePayload,
} from "../types/leaves.types";

interface BackendLeaveDTO {
  id?: string;
  _id?: string;
  branchId?: string;
  staffId?: string;
  name?: string;
  leaveCode?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: LeaveStatus;
  submittedBy?: string;
  submittedFor?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendLeaveListResponse {
  success: boolean;
  status: string;
  message?: string;
  data: BackendLeaveDTO[];
  meta?: {
    total: number;
    page: string | number;
    limit: string | number;
    totalPages: number;
  };
}

interface BackendLeaveSingleResponse {
  success: boolean;
  status: string;
  message?: string;
  data: BackendLeaveDTO;
}

const normalizeLeave = (raw: BackendLeaveDTO): Leave => {
  const staffObj = typeof raw.staffId === "object" ? (raw.staffId as unknown as { _id?: string; name?: string }) : null;
  const submittedByObj = typeof raw.submittedBy === "object" ? (raw.submittedBy as unknown as { name?: string }) : null;
  const submittedForObj = typeof raw.submittedFor === "object" ? (raw.submittedFor as unknown as { name?: string }) : null;
  const reviewedByObj = typeof raw.reviewedBy === "object" ? (raw.reviewedBy as unknown as { name?: string }) : null;
  const cancelledByObj = typeof raw.cancelledBy === "object" ? (raw.cancelledBy as unknown as { name?: string }) : null;

  return {
    id: raw.id || raw._id || "",
    branchId: raw.branchId || "",
    staffId: typeof raw.staffId === "string" ? raw.staffId : staffObj?._id || "",
    name: raw.name || staffObj?.name || "Self Service",
    leaveCode: raw.leaveCode || "",
    leaveType: raw.leaveType || "",
    startDate: raw.startDate || "",
    endDate: raw.endDate || "",
    reason: raw.reason || "",
    status: raw.status || "pending",
    submittedBy: typeof raw.submittedBy === "string" ? raw.submittedBy : submittedByObj?.name || "",
    submittedFor: typeof raw.submittedFor === "string" ? raw.submittedFor : submittedForObj?.name || "self",
    reviewedBy: typeof raw.reviewedBy === "string" ? raw.reviewedBy : reviewedByObj?.name || (raw.reviewedBy as string | null) || null,
    reviewedAt: raw.reviewedAt || null,
    reviewNote: raw.reviewNote || null,
    cancelledBy: typeof raw.cancelledBy === "string" ? raw.cancelledBy : cancelledByObj?.name || (raw.cancelledBy as string | null) || null,
    cancelledAt: raw.cancelledAt || null,
    cancelReason: raw.cancelReason || null,
    createdAt: raw.createdAt || "",
    updatedAt: raw.updatedAt || "",
  };
};

export const getLeaves = async (params: LeaveListQuery = {}): Promise<PaginatedResponse<Leave>> => {
  const { data } = await apiClient.get<BackendLeaveListResponse>("/leaves", {
    params,
    branchScope: "current",
  });

  return {
    ...data,
    data: (data.data || []).map(normalizeLeave),
  };
};

export const getLeave = async (id: string): Promise<Leave> => {
  const { data } = await apiClient.get<BackendLeaveSingleResponse>(`/leaves/${id}`, {
    branchScope: "current",
  });
  return normalizeLeave(data.data);
};

export const createLeave = async (payload: CreateLeavePayload): Promise<Leave> => {
  const { data } = await apiClient.post<BackendLeaveSingleResponse>("/leaves", payload, {
    branchScope: "current",
  });
  return normalizeLeave(data.data);
};

export const updateLeave = async (id: string, payload: UpdateLeavePayload): Promise<Leave> => {
  const { data } = await apiClient.put<BackendLeaveSingleResponse>(`/leaves/${id}`, payload, {
    branchScope: "current",
  });
  return normalizeLeave(data.data);
};

export const approveLeave = async (id: string, reviewNote?: string): Promise<Leave> => {
  const { data } = await apiClient.post<BackendLeaveSingleResponse>(
    `/leaves/${id}/approve`,
    { reviewNote },
    { branchScope: "current" }
  );
  return normalizeLeave(data.data);
};

export const rejectLeave = async (id: string, reviewNote: string): Promise<Leave> => {
  const { data } = await apiClient.post<BackendLeaveSingleResponse>(
    `/leaves/${id}/reject`,
    { reviewNote },
    { branchScope: "current" }
  );
  return normalizeLeave(data.data);
};

export const cancelLeave = async (id: string, cancelReason: string): Promise<Leave> => {
  const { data } = await apiClient.post<BackendLeaveSingleResponse>(
    `/leaves/${id}/cancel`,
    { cancelReason },
    { branchScope: "current" }
  );
  return normalizeLeave(data.data);
};

