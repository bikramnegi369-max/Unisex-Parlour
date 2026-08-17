export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type LeaveSubmittedFor = "self" | string;

export interface Leave {
  id: string;
  branchId: string;
  staffId: string;
  name: string;
  leaveCode: string;
  leaveType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: string;
  status: LeaveStatus;
  submittedBy: string;
  submittedFor: LeaveSubmittedFor;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveListQuery {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  status?: string;
  staffId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateLeavePayload {
  staffId?: string;
  leaveType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: string;
}

export interface UpdateLeavePayload {
  leaveType?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  reason?: string;
}

export interface ApproveLeavePayload {
  reviewNote?: string;
}

export interface RejectLeavePayload {
  reviewNote: string;
}

export interface CancelLeavePayload {
  cancelReason: string;
}

export interface LeaveListResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Leave[];
  meta?: {
    total: number;
    page: string | number;
    limit: string | number;
    totalPages: number;
  };
}

export interface LeaveDetailsResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Leave;
}

export interface LeaveMutateResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Leave;
}

