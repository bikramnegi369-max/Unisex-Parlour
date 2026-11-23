export interface SystemTotals {
  cash: number;
  card: number;
  upi: number;
  other: number;
  totalCollected: number;
  totalRefunded: number;
  netExpected: number;
}

export interface SystemTotalsResponse {
  businessDate: string;
  branchTimezone: string;
  systemTotals: SystemTotals;
  alreadyClosed: boolean;
  existingClosureId?: string | null;
}

export interface PhysicalCounts {
  cash: number;
  card: number;
  upi: number;
  other: number;
  totalCounted?: number;
}

export interface Discrepancy {
  cashDelta: number;
  cardDelta: number;
  upiDelta: number;
  otherDelta: number;
  totalDelta: number;
  reason: string;
}

export interface DayClosure {
  id: string;
  businessDate: string;
  branchTimezone: string;
  branchId: { id: string; name: string; timezone?: string };
  systemTotals: SystemTotals;
  physicalCounts: PhysicalCounts;
  discrepancy: Discrepancy;
  reconciliationResult: "balanced" | "discrepant";
  status: "submitted" | "approved";
  submittedBy: { id: string; name: string; email: string };
  submittedAt: string;
  approvedBy?: { id: string; name: string; email: string } | null;
  approvedAt?: string | null;
  managerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitDayClosurePayload {
  businessDate: string;
  physicalCounts: {
    cash: number;
    card: number;
    upi: number;
    other: number;
  };
  discrepancyReason?: string;
}

export interface OperatingProfitReport {
  period: {
    startDate: string;
    endDate: string;
    timezone: string;
  };
  costCoverageNotice?: string;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  invoiceCount?: number;
  revenueStreams?: {
    services: number;
    retailProducts: number;
    memberships: number;
    subscriptions: number;
  };
  collections?: {
    cash: number;
    card: number;
    upi: number;
    other: number;
    totalCollected: number;
    netCollections: number;
  };
  operatingExpenses: Record<string, number> & { total: number };
  workforceCosts?: {
    finalizedGrossPayroll: number;
    approvedStaffCount: number;
    actualDisbursedPayroll?: number;
    disbursedPaymentsCount?: number;
  };
  operatingProfit: number;
  operatingResult?: number;
  operatingMarginPercentage: number;
}

export interface FinancialAlertsAndObligations {
  pendingExpenseApprovals: {
    count: number;
    totalAmount: number;
  };
  unreconciledClosures: {
    count: number;
    totalDiscrepancy: number;
  };
  outstandingSupplierInvoices: {
    count: number;
    totalUnpaidAmount: number;
  };
  outstandingPayrollObligations: {
    count: number;
    totalUnpaidAmount: number;
  };
}

export interface DayClosureQueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  reconciliationResult?: string;
}

export interface BranchPerformanceItem {
  branchId: string;
  branchName: string;
  branchCode?: string;
  timezone: string;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  invoiceCount: number;
  revenueStreams?: {
    services: number;
    retailProducts: number;
    memberships: number;
    subscriptions: number;
  };
  collections?: {
    cash: number;
    card: number;
    upi: number;
    other: number;
    totalCollected: number;
    netCollections: number;
  };
  operatingExpenses: number;
  finalizedGrossPayroll: number;
  actualDisbursedPayroll: number;
  operatingResult: number;
  operatingMarginPercentage: number;
  unreconciledClosuresCount: number;
  pendingExpenseApprovalsCount: number;
}

export interface BranchPerformanceResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  branches: BranchPerformanceItem[];
  consolidated: {
    grossRevenue: number;
    refunds: number;
    netRevenue: number;
    invoiceCount: number;
    totalCollected: number;
    operatingExpenses: number;
    finalizedGrossPayroll: number;
    actualDisbursedPayroll: number;
    operatingResult: number;
    operatingMarginPercentage: number;
  };
}

export interface FinancialTransaction {
  id: string;
  sourceType:
    | "customer_payment"
    | "customer_refund"
    | "expense"
    | "petty_cash"
    | "payroll_payment"
    | "supplier_payment";
  sourceId: string;
  branchId?: string;
  branchName?: string;
  eventDate: string;
  amount: number;
  direction: "inflow" | "outflow";
  method: string;
  category: string;
  referenceNumber: string;
  description: string;
  status: string;
  sourceReferenceId?: string;
  sourceModel?: string;
}

export interface FinancialTransactionsResponse {
  items: FinancialTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
  };
}

export interface TransactionsQueryParams {
  startDate?: string;
  endDate?: string;
  type?: string;
  method?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export interface FinanceAuditItem {
  id: string;
  entityType: "day_closure" | "expense" | "petty_cash";
  action: string;
  timestamp: string;
  actorName: string;
  actorEmail?: string;
  branchName?: string;
  referenceNumber: string;
  amount?: number;
  noteOrReason?: string;
  details?: Record<string, any>;
}

export interface FinanceAuditResponse {
  items: FinanceAuditItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditHistoryQueryParams {
  startDate?: string;
  endDate?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}

export interface ReportQueryParams {
  reportType: "pnl_statement" | "tender_reconciliation" | "expense_breakdown" | "revenue_streams";
  startDate: string;
  endDate: string;
  format?: "json" | "csv";
}

export type FinancialReportsSummaryData = OperatingProfitReport;
