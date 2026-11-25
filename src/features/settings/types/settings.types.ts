export type CanonicalWeekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface DayOperatingHours {
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface BreakWindow {
  startTime: string;
  endTime: string;
  label?: string;
}

export interface OrganizationSettingsDTO {
  id: string | null;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    logo: string | null;
    isActive: boolean;
    expenseApprovalThreshold: number;
    allowedExpenseCategories: string[];
  };
  profile: {
    displayName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    website: string | null;
  };
  regional: {
    timezone: string;
    currency: string;
    locale: string;
    dateFormat: "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY" | "DD-MM-YYYY";
    timeFormat: "HH:mm" | "hh:mm A";
    firstDayOfWeek: number;
  };
  defaults: {
    appointmentBufferMinutes: number;
    allowWalkIns: boolean;
    allowAdvanceBookings: boolean;
    reminderDefaultOffsetMinutes: number;
    attendanceGraceMinutes: number;
    autoMarkAbsentAfterCutoff: boolean;
    defaultWeeklyOffDays: number[];
    defaultHalfDayEligible: boolean;
    exportRetentionHours: number;
  };
  updatedAt: string | null;
}

export interface BranchSettingsDTO {
  id: string | null;
  organizationId: string;
  branchId: string;
  branch: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    isActive: boolean;
    timezone: string;
    bufferMinutes: number;
    operatingHoursConfigured: boolean;
    operatingHours: Record<CanonicalWeekday, DayOperatingHours> | null;
  };
  breakWindows: Partial<Record<CanonicalWeekday, BreakWindow[]>>;
  weeklyOffDays: number[] | null;
  appointmentOverrides: {
    bufferMinutes: number | null;
    allowWalkIns: boolean | null;
    allowAdvanceBookings: boolean | null;
    reminderDefaultOffsetMinutes: number | null;
  };
  attendanceOverrides: {
    graceMinutes: number | null;
    autoMarkAbsentAfterCutoff: boolean | null;
  };
  leaveOverrides: {
    allowHalfDay: boolean | null;
    allowBranchPolicyOverrides: boolean | null;
  };
  updatedAt: string | null;
}

export interface ResolvedSettingValue<T> {
  value: T;
  source: "branch_override" | "organization" | "system_default";
}

export interface EffectiveSettingsDTO {
  organizationId: string | null;
  branchId: string | null;
  regional: {
    timezone: ResolvedSettingValue<string>;
    currency: ResolvedSettingValue<string>;
    locale: ResolvedSettingValue<string>;
    dateFormat: ResolvedSettingValue<string>;
    timeFormat: ResolvedSettingValue<string>;
    firstDayOfWeek: ResolvedSettingValue<number>;
  };
  appointments: {
    bufferMinutes: ResolvedSettingValue<number>;
    allowWalkIns: ResolvedSettingValue<boolean>;
    allowAdvanceBookings: ResolvedSettingValue<boolean>;
    reminderDefaultOffsetMinutes: ResolvedSettingValue<number>;
  };
  attendance: {
    graceMinutes: ResolvedSettingValue<number>;
    autoMarkAbsentAfterCutoff: ResolvedSettingValue<boolean>;
  };
  leaves: {
    weeklyOffDays: ResolvedSettingValue<number[]>;
    allowHalfDay: ResolvedSettingValue<boolean>;
    allowBranchPolicyOverrides: ResolvedSettingValue<boolean>;
  };
  exports: {
    retentionHours: ResolvedSettingValue<number>;
  };
  operatingHours: {
    isConfigured: boolean;
    schedule: Record<CanonicalWeekday, DayOperatingHours> | null;
  };
}

export type CalendarEventType =
  | "public_holiday"
  | "org_holiday"
  | "branch_holiday"
  | "branch_closure"
  | "special_working_day";

export interface HolidayCalendarDTO {
  id: string;
  organizationId: string;
  branchId: string | null;
  date: string;
  endDate: string;
  eventType: CalendarEventType;
  name: string;
  description: string | null;
  isPaid: boolean;
  isWorkingDay: boolean;
  operatingHoursOverride: DayOperatingHours | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface HolidayMutationResult {
  holiday: HolidayCalendarDTO;
  conflicts: {
    count: number;
    dates: string[];
    appointments: Array<{
      id: string;
      appointmentCode: string;
      branchId: string | null;
      appointmentDate: string;
      startTime: string;
      endTime: string;
      status: string;
    }>;
  };
}

export interface LeavePolicyDTO {
  id: string;
  organizationId: string;
  branchId: string | null;
  code: string;
  name: string;
  description: string | null;
  isPaid: boolean;
  annualEntitlement: number;
  carryForwardLimit: number;
  allowHalfDay: boolean;
  maxConsecutiveDays: number | null;
  excludeHolidays: boolean;
  excludeWeeklyOffs: boolean;
  excessBehavior: "convert_to_unpaid" | "reject";
  allowNegativeBalance: boolean;
  negativeBalancePayrollTreatment: "unpaid_deduction" | "carry_forward_debt" | "none";
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ExportDomain = "staff" | "customers" | "appointments" | "attendance" | "leaves";
export type ExportFormat = "json" | "csv";
export type ExportStatus = "pending" | "processing" | "completed" | "failed" | "expired";

export interface ExportJobDTO {
  _id?: string;
  id?: string;
  organizationId: string;
  branchId: string | null;
  requestedBy: string;
  domain: ExportDomain;
  format: ExportFormat;
  status: ExportStatus;
  recordCount: number;
  fileName: string | null;
  mimeType: string | null;
  expiresAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface BackupStatusDTO {
  organizationDatabaseDumpAvailable: boolean;
  supportedDomains: ExportDomain[];
  supportedFormats: ExportFormat[];
  retentionHours: number;
  note: string;
}
