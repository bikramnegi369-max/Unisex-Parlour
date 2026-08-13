import type { PaginatedResponse } from "@/types/api.types";

export type AppointmentStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type BookingType = "advance" | "walk_in";

export type ReminderChannelStatus =
  | "pending"
  | "scheduled"
  | "processing"
  | "sent"
  | "failed"
  | "cancelled";

export type ReminderAggregateStatus =
  | "pending"
  | "scheduled"
  | "processing"
  | "sent"
  | "partial_delivery"
  | "failed"
  | "cancelled";

export interface AppointmentReminderChannelState {
  status: ReminderChannelStatus;
  sentAt?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
}

export interface AppointmentServiceSnapshot {
  serviceId: string;
  name: string;
  duration: number; // in minutes
  price: number;
  taxRate?: number;
  taxAmount?: number;
  category?: string;
}

export interface AppointmentPricing {
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
}

export interface AppointmentCancellation {
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  reason?: string | null;
}

export interface AppointmentReminder {
  enabled: boolean;
  channel: "email" | "sms" | "both";
  offsetMinutes: number;
  sendAt?: string | null;
  status: ReminderAggregateStatus;
  sentAt?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  email?: AppointmentReminderChannelState;
  sms?: AppointmentReminderChannelState;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface StaffSummary {
  id: string;
  name: string;
  role?: string;
}

export interface BranchSummary {
  id: string;
  name: string;
  timezone?: string;
}

export interface Appointment {
  id: string;
  appointmentCode?: string;
  organizationId: string;
  branchId: string;
  customerId: string;
  serviceIds: string[];
  services: AppointmentServiceSnapshot[];
  staffId?: string | null;
  bookingType: BookingType;
  status: AppointmentStatus;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  totalDuration?: number; // in minutes
  startAt?: string; // ISO Datetime
  endAt?: string; // ISO Datetime
  notes?: string;
  cancellationReason?: string;
  cancellation?: AppointmentCancellation;
  completedAt?: string;
  cancelledAt?: string;
  reminder?: AppointmentReminder;
  pricing?: AppointmentPricing;
  createdAt: string;
  updatedAt: string;
  // Populated optional references from backend
  customer?: CustomerSummary;
  staff?: StaffSummary | null;
  branch?: BranchSummary;
}

export interface CreateAppointmentPayload {
  branchId: string; // Authoritative mutation target branch
  customerId: string;
  serviceIds: string[];
  staffId?: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  bookingType: BookingType;
  notes?: string;
  reminder?: {
    enabled: boolean;
    channel: "email" | "sms" | "both";
    offsetMinutes: number;
  };
}

export interface TriggerReminderPayload {
  branchId: string;
}

export interface UpdateAppointmentPayload {
  branchId: string;
  notes?: string;
  customerId?: string;
}

export interface RescheduleAppointmentPayload {
  branchId: string; // Same-branch check invariant
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  reason?: string;
}

export interface AssignStaffPayload {
  branchId: string;
  staffId: string | null;
}

export interface UpdateAppointmentStatusPayload {
  branchId: string;
  status: AppointmentStatus;
  cancellationReason?: string;
}

export interface DeleteAppointmentPayload {
  branchId: string;
}

export interface AppointmentListQuery {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: AppointmentStatus | "all";
  bookingType?: BookingType | "all";
  customerId?: string;
  staffId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

export type AppointmentListResponse = PaginatedResponse<Appointment>;

export interface AppointmentDetailsResponse {
  success: boolean;
  status: string;
  message: string;
  data: Appointment;
}

export interface AppointmentMutateResponse {
  success: boolean;
  status: string;
  message: string;
  data: Appointment;
}
