import { apiClient } from "@/lib/api/axios";

export interface AllowanceDeductionItem {
  name: string;
  amount: number;
}

export interface PaidLeavePolicy {
  annualEntitlement: number;
  carryForwardDays?: number;
}

export interface SalaryStructure {
  id?: string;
  _id?: string;
  staffId: string;
  payType: "fixed_monthly" | "hourly";
  baseSalary: number;
  hourlyRate: number;
  paidLeavePolicy?: PaidLeavePolicy;
  allowances: AllowanceDeductionItem[];
  deductions: AllowanceDeductionItem[];
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive?: boolean;
}

export interface PayrollPeriod {
  id?: string;
  _id?: string;
  year: number;
  month: number;
  monthYear: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: "open" | "processing" | "closed";
}

export interface AdjustmentItem {
  _id?: string;
  type: "earning" | "deduction";
  amount: number;
  reason: string;
  reference?: string | null;
  createdBy?: { _id: string; name: string; email?: string } | string;
  createdAt: string;
}

export interface PayrollIncentiveLedgerSnapshot {
  ledgerEntryId: string;
  sourceBranchId: string;
  sourceType:
    | "service_commission"
    | "subscription_sale_commission"
    | "membership_sale_commission"
    | "retail_sale_commission";
  sourceAmountInPaise: number;
  clawbackAmountInPaise: number;
  payableAmountInPaise: number;
  clawbackLedgerEntryIds: string[];
}

export interface PayrollRecord {
  id?: string;
  _id?: string;
  organizationId: string;
  branchId: string | { _id: string; name: string; code?: string };
  payrollPeriodId: string;
  staffId:
    | string
    | {
        _id: string;
        name: string;
        staffCode: string;
        designation: string;
        email?: string;
      };
  monthYear: string;
  status: "draft" | "pending_approval" | "approved" | "paid" | "cancelled";
  salaryStructureSnapshot: {
    salaryStructureId?: string;
    payType: string;
    baseSalary: number;
    hourlyRate: number;
    paidLeavePolicy?: PaidLeavePolicy;
    allowances: AllowanceDeductionItem[];
    deductions: AllowanceDeductionItem[];
  };
  attendanceSummarySnapshot: {
    totalDaysInMonth: number;
    eligibleDays: number;
    presentDays: number;
    lateDays: number;
    earlyDepartureDays: number;
    incompleteDays: number;
    unresolvedConflicts: number;
    paidLeaveEntitlement?: number;
    previouslyConsumedPaidLeave?: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    absentDays: number;
    payableDays?: number;
  };
  incentiveEvaluationIds?: string[];
  incentiveAmountInPaise?: number;
  incentiveLedgerScopeBranchId?: string | null;
  incentiveLedgerEntries?: PayrollIncentiveLedgerSnapshot[];
  incentiveLedgerEntryIds?: string[];
  incentiveLedgerClawbackEntryIds?: string[];
  incentiveLedgerGrossInPaise?: number;
  incentiveLedgerClawbackInPaise?: number;
  incentiveLedgerAmountInPaise?: number;
  calculations: {
    prorationFactor: number;
    dailySalaryRate?: number;
    payableDays?: number;
    proratedBaseSalary?: number;
    grossBaseSalary: number;
    totalAllowances: number;
    totalGrossPay: number;
    unpaidLeaveDeduction: number;
    fixedDeductions: number;
    totalAdjustmentsEarning?: number;
    totalAdjustmentsDeduction?: number;
    totalIncentivesInPaise?: number;
    totalDeductions: number;
    netPayable: number;
  };
  adjustments?: AdjustmentItem[];
  approvalBlocked: boolean;
  approvalBlockReasons: string[];
  paymentMethod?: "bank_transfer" | "cash" | "cheque" | "upi" | null;
  paymentReference?: string | null;
  manualPaymentStatus?: "none" | "recorded" | "confirmed" | "failed" | "reversed";
  manualPaymentId?: string | null;
  manualPaymentAmountInPaise?: number | null;
  paymentHistory?: PayrollPaymentAttempt[];
  latestPaymentAttempt?: PayrollPaymentAttempt | null;
  disbursedAt?: string | null;
  createdAt: string;
}

export interface PayrollPaymentAttempt {
  _id: string;
  amountInPaise: number;
  paymentMethod: "bank_transfer" | "cash" | "cheque" | "upi";
  paymentReference: string;
  paymentDate: string;
  status: "recorded" | "confirmed" | "failed" | "reversed";
  recordedAt: string;
  incentiveEvaluationIds?: string[];
  incentiveAmountInPaise?: number;
  incentiveLedgerEntryIds?: string[];
  incentiveLedgerAmountInPaise?: number;
  confirmedAt?: string | null;
  failureReason?: string | null;
  reversalReason?: string | null;
}

export interface PayrollPaymentLifecycleResponse {
  record: PayrollRecord;
  payment: PayrollPaymentAttempt | null;
  isIdempotentReplay: boolean;
}

export interface ListRecordsResponse {
  data: PayrollRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPayable: number;
    count: number;
    blockedCount?: number;
  };
}

export const payrollApi = {
  // Salary Structure
  setSalaryStructure: async (
    data: SalaryStructure,
  ): Promise<SalaryStructure> => {
    const res = await apiClient.post("/payroll/structures", data, {
      branchScope: "current",
    });
    return res.data.data;
  },

  getEffectiveSalaryStructure: async (
    staffId: string,
  ): Promise<SalaryStructure> => {
    const res = await apiClient.get(`/payroll/structures/${staffId}`, {
      branchScope: "current",
    });
    return res.data.data;
  },

  getSalaryStructureHistory: async (
    staffId: string,
  ): Promise<SalaryStructure[]> => {
    const res = await apiClient.get(`/payroll/structures/${staffId}/history`, {
      branchScope: "current",
    });
    return res.data.data;
  },

  // Payroll Periods
  createPeriod: async (data: {
    year: number;
    month: number;
  }): Promise<PayrollPeriod> => {
    const res = await apiClient.post("/payroll/periods", data);
    return res.data.data;
  },

  listPeriods: async (): Promise<PayrollPeriod[]> => {
    const res = await apiClient.get("/payroll/periods");
    return res.data.data;
  },

  // Calculation
  calculatePayroll: async (data: {
    payrollPeriodId: string;
    staffIds?: string[];
  }): Promise<PayrollRecord[]> => {
    const res = await apiClient.post("/payroll/calculate", data, {
      branchScope: "current",
    });
    return res.data.data;
  },

  // Lifecycle transitions
  submitForApproval: async (recordId: string): Promise<PayrollRecord> => {
    const res = await apiClient.post(`/payroll/records/${recordId}/submit`, {}, {
      branchScope: "current",
    });
    return res.data.data;
  },

  approveRecord: async (recordId: string): Promise<PayrollRecord> => {
    const res = await apiClient.post(`/payroll/records/${recordId}/approve`, {}, {
      branchScope: "current",
    });
    return res.data.data;
  },

  recordPayment: async (
    recordId: string,
    data: {
      paymentMethod: "bank_transfer" | "cash" | "cheque" | "upi";
      paymentReference: string;
      amountInPaise: number;
      paymentDate: string;
      idempotencyKey: string;
    },
  ): Promise<PayrollPaymentLifecycleResponse> => {
    const res = await apiClient.post(`/payroll/records/${recordId}/pay`, data, {
      branchScope: "current",
    });
    return res.data.data;
  },

  confirmPayment: async (
    recordId: string,
    paymentId: string,
  ): Promise<PayrollPaymentLifecycleResponse> => {
    const res = await apiClient.post(
      `/payroll/records/${recordId}/payments/${paymentId}/confirm`,
      { confirmActualPayment: true },
      { branchScope: "current" },
    );
    return res.data.data;
  },

  failPayment: async (
    recordId: string,
    paymentId: string,
    failureReason: string,
  ): Promise<PayrollPaymentLifecycleResponse> => {
    const res = await apiClient.post(
      `/payroll/records/${recordId}/payments/${paymentId}/fail`,
      { failureReason },
      { branchScope: "current" },
    );
    return res.data.data;
  },

  addAdjustment: async (
    recordId: string,
    data: {
      type: "earning" | "deduction";
      amount: number;
      reason: string;
      reference?: string;
    },
  ): Promise<PayrollRecord> => {
    const res = await apiClient.post(
      `/payroll/records/${recordId}/adjust`,
      data,
      { branchScope: "current" },
    );
    return res.data.data;
  },

  reversePayment: async (
    recordId: string,
    data: { reversalReason: string },
  ): Promise<PayrollRecord> => {
    const res = await apiClient.post(
      `/payroll/records/${recordId}/reverse`,
      data,
      { branchScope: "current" },
    );
    return res.data.data;
  },

  // Listing & Details
  listRecords: async (params?: {
    monthYear?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    staffId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<ListRecordsResponse> => {
    const res = await apiClient.get("/payroll/records", {
      params,
      branchScope: "current",
    });
    // Backward compatibility: res.data.data may be array or full object
    return {
      data: res.data.data || [],
      pagination: res.data.pagination || {
        page: 1,
        limit: 25,
        total: res.data.data?.length || 0,
        totalPages: 1,
      },
      summary: res.data.summary || {
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPayable: 0,
        count: res.data.data?.length || 0,
      },
    };
  },

  getRecordById: async (recordId: string): Promise<PayrollRecord> => {
    const res = await apiClient.get(`/payroll/records/${recordId}`, {
      branchScope: "current",
    });
    return res.data.data;
  },

  fetchPayslipPdfBlob: async (recordId: string): Promise<Blob> => {
    const res = await apiClient.get(
      `/payroll/records/${recordId}/payslip-pdf`,
      {
        responseType: "blob",
        branchScope: "current",
      },
    );
    return new Blob([res.data], { type: "application/pdf" });
  },

  downloadPayslipPdf: async (
    recordId: string,
    filename = "payslip.pdf",
  ): Promise<void> => {
    const blob = await payrollApi.fetchPayslipPdfBlob(recordId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  printPayslipPdf: async (recordId: string): Promise<void> => {
    const blob = await payrollApi.fetchPayslipPdfBlob(recordId);
    const url = window.URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        iframe.remove();
        window.URL.revokeObjectURL(url);
      }, 60_000);
    };
    document.body.appendChild(iframe);
  },
};
