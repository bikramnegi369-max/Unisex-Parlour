export type SchemeType = "COMMISSION" | "TARGET_BONUS" | "ATTENDANCE_BONUS" | "HYBRID";

export type CalculationBasis =
  | "SERVICE_NET_REVENUE"
  | "SUBSCRIPTION_NET_REVENUE"
  | "MEMBERSHIP_NET_REVENUE"
  | "PRODUCT_NET_REVENUE"
  | "TOTAL_INVOICE_NET_REVENUE"
  | "SERVICE_COUNT"
  | "ATTENDANCE_DAYS";

export const calculationBasisLabels: Record<CalculationBasis, string> = {
  SERVICE_NET_REVENUE: "Service net revenue",
  SUBSCRIPTION_NET_REVENUE: "Subscription sale net revenue",
  MEMBERSHIP_NET_REVENUE: "Membership sale net revenue",
  PRODUCT_NET_REVENUE: "Retail product sale net revenue",
  TOTAL_INVOICE_NET_REVENUE: "Total invoice net revenue",
  SERVICE_COUNT: "Completed service count",
  ATTENDANCE_DAYS: "Verified attendance days",
};

export const formatCalculationBasisLabel = (basis: string): string => {
  if (Object.prototype.hasOwnProperty.call(calculationBasisLabels, basis)) {
    return calculationBasisLabels[basis as CalculationBasis];
  }
  return basis.replace(/_/g, " ").toLowerCase();
};

export const schemeTypeLabels: Record<SchemeType, string> = {
  COMMISSION: "Revenue commission",
  TARGET_BONUS: "Target bonus",
  ATTENDANCE_BONUS: "Attendance bonus",
  HYBRID: "Hybrid scheme",
};

export type SchemeStatus = "draft" | "active" | "paused" | "inactive" | "archived";
export type IncentiveLedgerEntryType = "ACCRUAL" | "CLAWBACK";
export type IncentiveLedgerSourceType =
  | "service_commission"
  | "subscription_sale_commission"
  | "membership_sale_commission"
  | "retail_sale_commission"
  | "attendance_bonus";

export type ScopeType = "ORGANIZATION" | "BRANCH" | "ROLE" | "STAFF";
export type AssignableScopeType = "ORGANIZATION" | "BRANCH" | "STAFF";

export interface CommissionTier {
  id?: string;
  _id?: string;
  minPaise: number;
  maxPaise: number | null;
  percentage: number;
  fixedPaise: number;
}

export interface SchemeRules {
  tiers: CommissionTier[];
  fixedAmountPaise: number;
  targetThresholdPaise: number;
  minimumAttendanceDays: number;
}

interface CommissionSchemeRequest {
  name: string;
  code: string;
  description: string;
  schemeType: "COMMISSION";
  calculationBasis:
    | "SERVICE_NET_REVENUE"
    | "SUBSCRIPTION_NET_REVENUE"
    | "MEMBERSHIP_NET_REVENUE"
    | "PRODUCT_NET_REVENUE";
  rules: Pick<SchemeRules, "fixedAmountPaise"> & { tiers: CommissionTier[] };
}

interface AttendanceBonusSchemeRequest {
  name: string;
  code: string;
  description: string;
  schemeType: "ATTENDANCE_BONUS";
  calculationBasis: "ATTENDANCE_DAYS";
  rules: Pick<SchemeRules, "fixedAmountPaise" | "minimumAttendanceDays"> & { tiers: [] };
}

export type CreateIncentiveSchemeRequest =
  | CommissionSchemeRequest
  | AttendanceBonusSchemeRequest;

export interface SchemeAssignmentRequest {
  schemeId: string;
  scopeType: AssignableScopeType;
  scopeId: string | null;
  startDate: string;
  endDate: string | null;
  priority: number;
}

export interface IncentiveScheme {
  id: string;
  _id?: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  schemeType: SchemeType;
  calculationBasis: CalculationBasis;
  rules: SchemeRules;
  status: SchemeStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const isSupportedIncentiveScheme = (
  scheme: Pick<IncentiveScheme, "schemeType" | "calculationBasis" | "rules">,
): boolean =>
  (scheme.schemeType === "COMMISSION" &&
    [
      "SERVICE_NET_REVENUE",
      "SUBSCRIPTION_NET_REVENUE",
      "MEMBERSHIP_NET_REVENUE",
      "PRODUCT_NET_REVENUE",
    ].includes(scheme.calculationBasis)) ||
  (scheme.schemeType === "ATTENDANCE_BONUS" &&
    scheme.calculationBasis === "ATTENDANCE_DAYS" &&
    Number.isInteger(scheme.rules.minimumAttendanceDays) &&
    scheme.rules.minimumAttendanceDays > 0 &&
    Number.isInteger(scheme.rules.fixedAmountPaise) &&
    scheme.rules.fixedAmountPaise > 0 &&
    scheme.rules.tiers.length === 0);

export interface SchemeAssignment {
  id: string;
  _id?: string;
  organizationId: string;
  schemeId: string | IncentiveScheme;
  scopeType: ScopeType;
  scopeId?: string | null;
  startDate: string;
  endDate?: string | null;
  priority: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface CalculationPreviewRequest {
  schemeId?: string;
  revenueInPaise: number;
  staffId?: string;
  branchId?: string;
  date?: string;
}

export interface CalculationPreviewResponse {
  scheme: {
    id: string;
    name: string;
    code: string;
    schemeType: SchemeType;
  };
  inputRevenueInPaise: number;
  earnedCommissionInPaise: number;
  snapshot: {
    calculationBasis: CalculationBasis;
    schemeCode?: string;
    appliedRate: number;
    fixedAmountPaise: number;
    tierMinPaise: number | null;
    tierMaxPaise: number | null;
  };
}

export interface AttendanceIncentiveEvaluation {
  id?: string;
  _id: string;
  staffId: string;
  schemeId: string;
  branchId: string;
  monthYear: string;
  targetDays: number;
  achievedDays: number;
  isTargetMet: boolean;
  bonusAwardedInPaise: number;
  status: "computed" | "overridden" | "finalized";
  blockReasons: string[];
  attendanceSnapshot: {
    timezone: string | null;
    sourceAttendanceRecordIds: string[];
    sourcePunchIds: string[];
    sourceLeaveRecordIds: string[];
    sourceLeaveExceptionIds: string[];
    days: Array<{
      date: string;
      status: string;
      creditedDays: number;
      attendanceRecordId: string | null;
      punchIds: string[];
      leaveIds: string[];
      leaveExceptionIds: string[];
    }>;
  };
}

export interface PopulatedInvoiceRef {
  _id: string;
  invoiceNumber: string;
  status?: string;
  totalAmount?: number;
}

export interface IncentiveLedgerEntry {
  id: string;
  _id?: string;
  organizationId: string;
  branchId: { _id: string; name: string } | string;
  staffId: { _id: string; name: string; staffCode?: string } | string;
  schemeId: { _id: string; name: string; code: string; schemeType: SchemeType } | string;
  entryType: IncentiveLedgerEntryType;
  sourceType: IncentiveLedgerSourceType;
  evaluationId?: string | null;
  settlementEventId?: string | null;
  invoiceId?: string | PopulatedInvoiceRef | null;
  lineItemId?: string | null;
  reversesLedgerId?: string | null;
  refundAmountInPaise?: number | null;
  fulfillmentStatus: "pending" | "confirmed" | "corrected" | "cancelled" | "not_applicable";
  fulfillmentConfirmedAt?: string | null;
  fulfillmentConfirmedBy?: string | null;
  sourceRevenueInPaise: number;
  attributedRevenueInPaise: number;
  amountInPaise: number;
  calculationSnapshot: {
    calculationBasis?: string;
    schemeCode?: string;
    appliedRate?: number;
    fixedAmountPaise?: number;
    tierMinPaise?: number | null;
    tierMaxPaise?: number | null;
    evaluationType?: string | null;
    targetDays?: number | null;
    achievedDays?: number | null;
  };
  idempotencyKey: string;
  payoutBatchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncentiveRecoveryObligation {
  id?: string;
  _id: string;
  organizationId: string;
  branchId: string;
  staffId: { _id: string; name: string; staffCode?: string } | string;
  clawbackLedgerId:
    | {
        _id: string;
        invoiceId: string;
        settlementEventId: string;
        reversesLedgerId?: string;
      }
    | string;
  originalClawbackInPaise: number;
  totalRecoveredInPaise: number;
  totalReservedInPaise: number;
  remainingAvailableInPaise: number;
  collectibleAvailableInPaise?: number;
  status: "pending" | "partially_recovered" | "recovered" | "written_off";
  paymentHistory?: IncentiveRecoveryPaymentAttempt[];
  allocations: Array<{
    allocationEventId: string;
    payoutBatchId: string;
    allocatedPaise: number;
    state: "reserved" | "confirmed" | "released" | "reversed";
    reservedAt: string;
    confirmedAt?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface IncentiveRecoveryPaymentAttempt {
  _id: string;
  amountInPaise: number;
  paymentMethod: "bank_transfer" | "cash" | "cheque" | "upi";
  paymentReference: string;
  paymentDate: string;
  reason: string;
  status: "recorded" | "confirmed" | "failed" | "reversed";
  recordedAt: string;
  recordedBy?: { _id: string; name: string } | string;
  confirmedAt?: string | null;
  confirmedBy?: { _id: string; name: string } | string | null;
  failureReason?: string | null;
  reversalReason?: string | null;
}

export interface IncentivesSummaryMetrics {
  totalAccruedPaise: number;
  totalClawbackPaise: number;
  netAccruedPaise: number;
  outstandingRecoveryPaise: number;
  pendingFulfillmentCount: number;
  schemes: {
    active: number;
    draft: number;
    paused: number;
    archived: number;
  };
}
