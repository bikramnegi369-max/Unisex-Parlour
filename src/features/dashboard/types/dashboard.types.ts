export type ComparisonPeriod = "previous_period" | "previous_year" | "none";

export type DateFilterPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export interface MetricDelta {
  current: number;
  previous: number | null;
  percentageChange: number | null;
  trend: "up" | "down" | "neutral";
}

export interface RateDelta {
  current: number | null;
  previous: number | null;
  percentagePointsChange: number | null;
  trend: "up" | "down" | "neutral";
}

export interface DashboardOverviewMeta {
  organizationId: string;
  branchId: string | null;
  branchName: string;
  currency: string;
  timezone: string;
  startDate: string;
  endDate: string;
  comparisonStartDate: string | null;
  comparisonEndDate: string | null;
  generatedAt: string;
  availableWidgets: string[];
}

export interface RevenueTrendPoint {
  date: string;
  billedRevenue: number;
  collections: number;
  refunds: number;
  netCollections: number;
}

export interface TopServiceItem {
  id: string;
  name: string;
  count: number;
  revenue: number;
}

export interface BranchComparisonItem {
  branchId: string;
  branchName: string;
  billedRevenue: number;
  collections: number;
  appointmentsCount: number;
}

export interface DashboardOverviewData {
  success: boolean;
  meta: DashboardOverviewMeta;
  kpis?: {
    grossSales?: MetricDelta;
    discountsTotal?: MetricDelta;
    netSales?: MetricDelta;
    collections?: MetricDelta;
    refunds?: MetricDelta;
    netCollections?: MetricDelta;
    outstandingReceivables?: MetricDelta;
    averageBillValue?: MetricDelta;
    totalAppointments?: MetricDelta;
    newCustomers?: MetricDelta;
    repeatCustomerRate?: RateDelta;
  };
  revenueTrend?: RevenueTrendPoint[];
  appointments?: {
    byStatus: {
      scheduled: number;
      in_progress: number;
      completed: number;
      cancelled: number;
      no_show: number;
    };
    byBookingType: {
      advance: number;
      walk_in: number;
    };
    completionRate: number;
  };
  customers?: {
    totalActiveCustomers: number;
    newCustomersInPeriod: number;
    repeatCustomerRate: number;
    acquisitionSources: Array<{ source: string; count: number }>;
    newVsReturning: { new: number; returning: number };
  };
  services?: {
    topServices: TopServiceItem[];
    retailProducts: {
      totalQuantitySold: number;
      totalRevenue: number;
    };
  };
  branchComparison?: BranchComparisonItem[];
  finance?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    totalExpenses: number;
    operatingCashMargin?: number;
    expensesByCategory: Array<{ category: string; amount: number }>;
    error?: string;
  };
  inventory?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    outOfStockCount: number;
    lowStockCount: number;
    consumablesShortageCount: number;
    retailShortageCount: number;
    error?: string;
  };
  memberships?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    activeCount: number;
    expiringCount: number;
    newSoldInPeriod: number;
    salesAmountInPeriod?: number;
    error?: string;
  };
  subscriptions?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    activeCount: number;
    expiringCount: number;
    redemptionsInPeriod: number;
    soldInPeriod?: number;
    salesAmountInPeriod?: number;
    error?: string;
  };
  coupons?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    redemptionCount: number;
    totalDiscountGiven: number;
    error?: string;
  };
  loyalty?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    pointsEarned: number;
    pointsRedeemed: number;
    error?: string;
  };
  procurement?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    pendingOrdersCount: number;
    outstandingSupplierPayables: number;
    error?: string;
  };
  payroll?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    pendingApprovalsCount: number;
    totalPendingPayable: number;
    error?: string;
  };
  incentives?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    accruedIncentives: number;
    topPerformers: Array<{ staffId: string; staffName: string; amount: number }>;
    error?: string;
  };
}

export interface TimelineAppointmentItem {
  id: string;
  appointmentCode: string;
  customerName: string;
  customerPhone: string;
  staffName: string;
  staffId: string | null;
  services: Array<{ name: string; duration: number; price: number }>;
  startTime: string;
  endTime: string;
  startAt: string;
  endAt: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
  bookingType: "advance" | "walk_in";
  pricing: { subtotal: number; discount: number; total: number };
}

export interface StaffRosterItem {
  staffId: string;
  staffName: string;
  staffCode: string;
  designation: string;
  statusToday: "present" | "late" | "early_departure" | "incomplete" | "on_leave" | "absent";
  isClockedIn: boolean;
  currentAppointment: {
    appointmentCode: string;
    startTime: string;
    endTime: string;
    status: string;
  } | null;
}

export interface DashboardOperationsData {
  success: boolean;
  meta: {
    organizationId: string;
    branchId: string | null;
    branchName: string;
    timezone: string;
    date: string;
    generatedAt: string;
  };
  summary: {
    todayAppointmentsCount: number;
    totalBranchStaff: number;
    presentStaffCount: number;
    lateStaffCount: number;
    onLeaveStaffCount: number;
    clockedInNowCount: number;
    availableStaffCount: number;
  };
  appointmentsTimeline: TimelineAppointmentItem[];
  staffRoster: StaffRosterItem[];
  pendingTasks: {
    pendingLeavesCount: number;
    unreconciledAttendanceCount: number;
  };
}

export interface DashboardAlertItem {
  id: string;
  category: "inventory" | "hr" | "finance" | "memberships" | "operations";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  sourceModule: string;
  targetUrl: string;
  actionLabel: string;
  count: number;
  timestamp: string;
}

export interface DashboardAlertsData {
  success: boolean;
  meta: {
    organizationId: string;
    branchId: string | null;
    totalAlerts: number;
    generatedAt: string;
  };
  alerts: DashboardAlertItem[];
}
