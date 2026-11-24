import { apiClient } from "@/lib/api/axios";

export type AvailabilityStatus =
  | "available"
  | "unavailable"
  | "requires_review";

export type AvailabilityReasonCode =
  | "STAFF_NOT_FOUND"
  | "STAFF_INACTIVE"
  | "BRANCH_NOT_ASSIGNED"
  | "BRANCH_CLOSED"
  | "BRANCH_INACTIVE"
  | "SERVICE_NOT_SUPPORTED"
  | "STAFF_NOT_SCHEDULED"
  | "APPROVED_LEAVE"
  | "PARTIAL_DAY_LEAVE_CONFLICT"
  | "APPOINTMENT_CONFLICT"
  | "CROSS_BRANCH_CONFLICT"
  | "TRAVEL_TIME_CONFLICT"
  | "ATTENDANCE_CLOCKED_OUT"
  | "ATTENDANCE_INCOMPLETE"
  | "ATTENDANCE_CONFLICT"
  | "ATTENDANCE_REVIEW_REQUIRED"
  | "NO_ROSTER_CONFIGURED";

export const REASON_LABELS: Record<AvailabilityReasonCode, string> = {
  STAFF_NOT_FOUND: "Staff not found",
  STAFF_INACTIVE: "Staff inactive",
  BRANCH_NOT_ASSIGNED: "Not assigned to branch",
  BRANCH_CLOSED: "Branch closed",
  BRANCH_INACTIVE: "Branch inactive",
  SERVICE_NOT_SUPPORTED: "Not qualified for services",
  STAFF_NOT_SCHEDULED: "Not scheduled / off duty",
  APPROVED_LEAVE: "On approved leave",
  PARTIAL_DAY_LEAVE_CONFLICT: "Partial-day leave",
  APPOINTMENT_CONFLICT: "Booked during this time",
  CROSS_BRANCH_CONFLICT: "Booked at another branch",
  TRAVEL_TIME_CONFLICT: "Travel buffer conflict",
  ATTENDANCE_CLOCKED_OUT: "Clocked out for the day",
  ATTENDANCE_INCOMPLETE: "Attendance incomplete",
  ATTENDANCE_CONFLICT: "Attendance conflict",
  ATTENDANCE_REVIEW_REQUIRED: "Attendance review required",
  NO_ROSTER_CONFIGURED: "No roster configured",
};

export interface StaffSlotEvaluation {
  staffId: string;
  branchId: string | null;
  date: string;
  startAt: string;
  endAt: string;
  status: AvailabilityStatus;
  reasons: AvailabilityReasonCode[];
  warnings: AvailabilityReasonCode[];
  evaluatedAt: string;
  staff?: {
    id: string;
    name: string;
    designation?: string;
    phone?: string;
    avatarUrl?: string;
  };
  branch?: {
    id: string;
    name: string;
    timezone?: string;
  };
}

export interface SlotAvailabilityBatchResponse {
  date: string;
  startAt: string;
  endAt: string;
  totalStaff: number;
  availableCount: number;
  staff: StaffSlotEvaluation[];
}

export interface CalendarStaffLane {
  id: string;
  name: string;
  designation?: string;
  status: string;
  avatarUrl?: string;
  branches: Array<{
    branchId: string;
    branchName?: string;
    isPrimary?: boolean;
  }>;
  roster: {
    id: string;
    weeklySchedule?: Record<string, unknown>;
    overrides?: Array<Record<string, unknown>>;
  } | null;
  leave: {
    id: string;
    leaveType: string;
    isPartialDay: boolean;
    dayPart?: string;
    startTime?: string;
    endTime?: string;
    startAt?: string;
    endAt?: string;
  } | null;
  attendance: {
    status: string;
    isReconciled: boolean;
    conflictType: string;
  } | null;
  attendanceDetails?: {
    status: "present" | "absent" | "review_required" | "not_started" | "on_leave" | "clocked_out";
    attendanceDate: string;
    scheduledShiftStart?: string | null;
    scheduledShiftEnd?: string | null;
    clockInTime?: string | null;
    clockOutTime?: string | null;
    reviewReason?: string | null;
  } | null;
}

export interface CalendarAvailabilityResponse {
  date: string;
  isAllBranches: boolean;
  branchCount: number;
  staffCount: number;
  lanes: CalendarStaffLane[];
}

export interface GetStaffAvailabilityParams {
  branchId?: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  serviceIds?: string[];
  staffId?: string;
  excludeAppointmentId?: string;
}

export interface GetCalendarAvailabilityParams {
  branchId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  staffId?: string;
}

export const staffAvailabilityApi = {
  /**
   * Evaluates slot availability for staff members
   */
  getStaffAvailability: async (
    params: GetStaffAvailabilityParams,
  ): Promise<SlotAvailabilityBatchResponse> => {
    const queryParams: Record<string, unknown> = {
      branchId: params.branchId,
      date: params.date,
      startTime: params.startTime,
      duration: params.duration || 30,
    };

    if (params.endTime) queryParams.endTime = params.endTime;
    if (params.staffId) queryParams.staffId = params.staffId;
    if (params.excludeAppointmentId) {
      queryParams.excludeAppointmentId = params.excludeAppointmentId;
    }

    if (params.serviceIds && params.serviceIds.length > 0) {
      queryParams.serviceIds = params.serviceIds.join(",");
    }

    const response = await apiClient.get<{
      success: boolean;
      data: SlotAvailabilityBatchResponse;
    }>("/appointments/availability/staff", {
      params: queryParams,
    });

    return response.data.data;
  },

  /**
   * Retrieves calendar matrix lanes with authoritative availability, leave, and attendance signals
   */
  getCalendarAvailability: async (
    params: GetCalendarAvailabilityParams,
  ): Promise<CalendarAvailabilityResponse> => {
    const queryParams: Record<string, unknown> = {};

    if (params.branchId && params.branchId !== "all") {
      queryParams.branchId = params.branchId;
    }
    if (params.date) queryParams.date = params.date;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.staffId) queryParams.staffId = params.staffId;

    const response = await apiClient.get<{
      success: boolean;
      data: CalendarAvailabilityResponse;
    }>("/appointments/calendar/staff-availability", {
      params: queryParams,
    });

    return response.data.data;
  },
};
