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
  submittedById?: string;
  submittedFor: LeaveSubmittedFor;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  isPartialDay?: boolean;
  dayPart?: "first_half" | "second_half" | "custom" | null;
  startTime?: string | null;
  endTime?: string | null;
  startAt?: string | null;
  endAt?: string | null;
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
  isPartialDay?: boolean;
  dayPart?: "first_half" | "second_half" | "custom";
  startTime?: string;
  endTime?: string;
}

export interface UpdateLeavePayload {
  leaveType?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  reason?: string;
  isPartialDay?: boolean;
  dayPart?: "first_half" | "second_half" | "custom";
  startTime?: string;
  endTime?: string;
}

export interface LeaveConflictAppointment {
  id: string;
  appointmentCode: string;
  customerName: string;
  customerId?: string;
  serviceNames: string[];
  startTime: string; // HH:mm or ISO
  endTime: string;   // HH:mm or ISO
  appointmentDate?: string; // YYYY-MM-DD
  date?: string;
  startAt?: string;
  endAt?: string;
}

export interface LeaveConflictsResponse {
  success: boolean;
  count: number;
  conflicts: LeaveConflictAppointment[];
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

