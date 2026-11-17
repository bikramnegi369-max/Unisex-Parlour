"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  payrollApi,
  PayrollRecord,
} from "../api/payroll.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { SalaryStructureManager } from "./SalaryStructureManager";
import { CalculationBreakdownDialog } from "./CalculationBreakdownDialog";
import { PayrollPaymentDialog } from "./PayrollPaymentDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  CreditCard,
  Plus,
  RefreshCw,
  FileText,
  Search,
  DollarSign,
  Users,
  ShieldAlert,
  Calendar,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  FilePenLine,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/errors";

export function PayrollDashboardView() {
  const queryClient = useQueryClient();
  const { currentBranch, currentBranchId } = useBranchContext();
  const { user } = useAuth();

  // Granular Least-Privilege Permissions — strict 1:1 match with backend RBAC
  const canCalculate = hasPermission(user, "payroll.calculate");
  const canApprove = hasPermission(user, "payroll.approve");
  const canDisburse = hasPermission(user, "payroll.disburse");
  const canAdjust = hasPermission(user, "payroll.adjust");
  const canReverse = hasPermission(user, "payroll.reverse");
  const canExport = hasPermission(user, "payroll.export");

  // View Mode: Operational processing vs Historical Reporting
  const [activeTab, setActiveTab] = useState<"processing" | "structures">(
    "processing",
  );

  // Filter Mode: "period" (Single Month Period) vs "custom_range" (Historical Date Range) vs "all_periods"
  const [periodFilterMode, setPeriodFilterMode] = useState<
    "period" | "custom_range" | "all_periods"
  >("period");

  // Period / Date Range States
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Server Pagination & Sorting States
  const [page, setPage] = useState<number>(1);
  const limit = 20;
  const sortBy = "createdAt";
  const sortOrder = "desc" as const;

  // Modals & Action States
  const [inspectingRecord, setInspectingRecord] =
    useState<PayrollRecord | null>(null);
  const [payingRecord, setPayingRecord] = useState<PayrollRecord | null>(null);

  // Reversal Modal
  const [reversingRecord, setReversingRecord] = useState<PayrollRecord | null>(
    null,
  );
  const [reversalReason, setReversalReason] = useState("");

  // Adjustment Modal
  const [adjustingRecord, setAdjustingRecord] = useState<PayrollRecord | null>(
    null,
  );
  const [adjType, setAdjType] = useState<"earning" | "deduction">("earning");
  const [adjAmount, setAdjAmount] = useState<string>("");
  const [adjReason, setAdjReason] = useState<string>("");
  const [adjRef, setAdjRef] = useState<string>("");

  // 1. Periods query
  const {
    data: periods = [],
    isError: isPeriodsError,
    error: periodsError,
    isFetching: isPeriodsFetching,
    refetch: refetchPeriods,
  } = useQuery({
    queryKey: ["payroll", "periods"],
    queryFn: async () => {
      const data = await payrollApi.listPeriods();
      if (data.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(data[0]._id || data[0].id || "");
        setSelectedMonthYear(data[0].monthYear);
      }
      return data;
    },
  });

  // Effective Query Parameters for Records
  const queryParams = useMemo(() => {
    const params: NonNullable<Parameters<typeof payrollApi.listRecords>[0]> = {
      page,
      limit,
      sortBy,
      sortOrder,
    };

    if (periodFilterMode === "period" && selectedMonthYear) {
      params.monthYear = selectedMonthYear;
    } else if (periodFilterMode === "custom_range") {
      if (customStartDate) params.startDate = customStartDate;
      if (customEndDate) params.endDate = customEndDate;
    }
    // all_periods sends neither monthYear nor startDate/endDate

    if (statusFilter && statusFilter !== "all") {
      params.status = statusFilter;
    }
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

    return params;
  }, [
    periodFilterMode,
    selectedMonthYear,
    customStartDate,
    customEndDate,
    statusFilter,
    searchTerm,
    page,
    limit,
    sortBy,
    sortOrder,
  ]);

  // 2. Records query with Server Pagination, Search, Date Filtering
  const {
    data: recordsResponse,
    isLoading: isLoadingRecords,
    isError: isRecordsError,
    error: recordsError,
    isRefetching: isRefetchingRecords,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: ["payroll", "records", { currentBranchId, queryParams }],
    queryFn: () => payrollApi.listRecords(queryParams),
  });

  const records = recordsResponse?.data || [];
  const pagination = recordsResponse?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  };
  const serverSummary = recordsResponse?.summary || {
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPayable: 0,
    count: 0,
    blockedCount: 0,
  };

  // Reset Filters Handler
  const handleResetFilters = () => {
    setPeriodFilterMode("period");
    if (periods.length > 0) {
      setSelectedPeriodId(periods[0]._id || periods[0].id || "");
      setSelectedMonthYear(periods[0].monthYear);
    }
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchTerm("");
    setStatusFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    periodFilterMode !== "period" ||
    statusFilter !== "all" ||
    searchTerm.trim().length > 0 ||
    customStartDate.length > 0 ||
    customEndDate.length > 0;

  // Mutations
  const calculateMutation = useMutation({
    mutationFn: () =>
      payrollApi.calculatePayroll({ payrollPeriodId: selectedPeriodId }),
    onSuccess: (data) => {
      toast.success(`Calculated payroll for ${data.length} staff member(s)`);
      queryClient.invalidateQueries({ queryKey: ["payroll", "records"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to calculate payroll"));
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => payrollApi.approveRecord(id),
    onSuccess: () => {
      toast.success("Payroll record approved");
      queryClient.invalidateQueries({ queryKey: ["payroll", "records"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to approve record"));
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof payrollApi.recordPayment>[1];
    }) => payrollApi.recordPayment(id, data),
    onSuccess: () => {
      toast.success("Payment attempt recorded. Payroll remains unsettled until confirmation.");
      queryClient.invalidateQueries({ queryKey: ["payroll", "records"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to record payroll payment"));
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: ({ recordId, paymentId }: { recordId: string; paymentId: string }) =>
      payrollApi.confirmPayment(recordId, paymentId),
    onSuccess: () => {
      toast.success("Actual payment confirmed; payroll is settled.");
      setPayingRecord(null);
      queryClient.invalidateQueries({ queryKey: ["payroll", "records"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to confirm payroll settlement"));
    },
  });

  const failPaymentMutation = useMutation({
    mutationFn: ({
      recordId,
      paymentId,
      failureReason,
    }: {
      recordId: string;
      paymentId: string;
      failureReason: string;
    }) => payrollApi.failPayment(recordId, paymentId, failureReason),
    onSuccess: () => {
      toast.success("Payment attempt marked failed. Payroll remains approved and may be retried.");
      queryClient.invalidateQueries({ queryKey: ["payroll", "records"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to record payment failure"));
    },
  });

  const reverseMutation = useMutation({
    mutationFn: ({
      id,
      reversalReason,
    }: {
      id: string;
      reversalReason: string;
    }) => payrollApi.reversePayment(id, { reversalReason }),
    onSuccess: () => {
      toast.success("Payroll record cancelled/reversed with audit trail");
      setReversingRecord(null);
      setReversalReason("");
      queryClient.invalidateQueries({ queryKey: ["payroll", "records"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to reverse payment"));
    },
  });

  const addAdjustmentMutation = useMutation({
    mutationFn: ({
      id,
      type,
      amount,
      reason,
      reference,
    }: {
      id: string;
      type: "earning" | "deduction";
      amount: number;
      reason: string;
      reference?: string;
    }) => payrollApi.addAdjustment(id, { type, amount, reason, reference }),
    onSuccess: () => {
      toast.success("Manual adjustment recorded & totals recalculated");
      setAdjustingRecord(null);
      setAdjAmount("");
      setAdjReason("");
      setAdjRef("");
      queryClient.invalidateQueries({ queryKey: ["payroll", "records"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to add adjustment"));
    },
  });

  const createPeriodMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      return payrollApi.createPeriod({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
    },
    onSuccess: (newPeriod) => {
      toast.success(`Payroll period ${newPeriod.monthYear} initialized`);
      setSelectedPeriodId(newPeriod._id || newPeriod.id || "");
      setSelectedMonthYear(newPeriod.monthYear);
      setPeriodFilterMode("period");
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to create period"));
    },
  });

  const getStatusBadge = (status: string, isBlocked: boolean) => {
    if (isBlocked && status !== "paid" && status !== "cancelled") {
      return (
        <Badge
          variant="destructive"
          className="flex items-center gap-1 font-semibold"
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Blocked</span>
        </Badge>
      );
    }

    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            Draft
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            Pending Approval
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="text-emerald-600 border-emerald-300 bg-emerald-50"
          >
            Approved
          </Badge>
        );
      case "paid":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-600 text-white font-semibold"
          >
            Paid
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="text-muted-foreground line-through">
            Reversed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Salary & Payroll Management
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {currentBranch?.name || "All Branches"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Authoritative compensation engine with calendar proration, biometric
            attendance verification, and audited ledger disbursals.
          </p>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border self-start md:self-auto">
          <button
            onClick={() => setActiveTab("processing")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "processing"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Payroll Runs & History
          </button>
          <button
            onClick={() => setActiveTab("structures")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "structures"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Salary Structures
          </button>
        </div>
      </div>

      {activeTab === "structures" ? (
        <SalaryStructureManager />
      ) : (
        <>
          {/* Dashboard Scope Indicator */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Active Scope:
              </span>
              <Badge variant="outline" className="font-mono text-xs bg-muted/30">
                {periodFilterMode === "period"
                  ? `Payroll Period: ${selectedMonthYear || "None"}`
                  : periodFilterMode === "custom_range"
                    ? `Date Range: ${customStartDate || "Start"} to ${customEndDate || "End"}`
                    : "All Periods (Historical Audit)"}
              </Badge>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Reset All Filters
              </Button>
            )}
          </div>

          {/* KPI Dashboard Cards — Authoritative Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Total Gross Pay ({periodFilterMode === "all_periods" ? "All Time" : "Period"})</span>
                <DollarSign className="w-4 h-4 text-primary" />
              </span>
              <div className="text-2xl font-bold text-foreground font-mono">
                ₹{serverSummary.totalGrossPay.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Base salary + approved allowances
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Net Payable Balance</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </span>
              <div className="text-2xl font-bold text-emerald-600 font-mono">
                ₹{serverSummary.totalNetPayable.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground">
                After LOP, fixed & manual deductions
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Payroll Records</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </span>
              <div className="text-2xl font-bold text-foreground font-mono">
                {serverSummary.count} records
              </div>
              <div className="text-[11px] text-muted-foreground">
                Matching selected filters & branch scope
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Attendance Blocker Status</span>
                <ShieldAlert className="w-4 h-4 text-destructive" />
              </span>
              <div className="text-2xl font-bold text-destructive font-mono">
                {serverSummary.blockedCount ?? 0} Blocked
              </div>
              <div className="text-[11px] text-destructive/80">
                Incomplete attendance blocks approval
              </div>
            </div>
          </div>

          {/* Production Period Selector & Reporting Controls */}
          <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              {/* Filter Mode Selector */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border text-xs">
                <button
                  onClick={() => {
                    setPeriodFilterMode("period");
                    setPage(1);
                  }}
                  className={`px-3 py-1 font-semibold rounded-lg transition-all ${
                    periodFilterMode === "period"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Specific Period
                </button>
                <button
                  onClick={() => {
                    setPeriodFilterMode("custom_range");
                    setPage(1);
                  }}
                  className={`px-3 py-1 font-semibold rounded-lg transition-all ${
                    periodFilterMode === "custom_range"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Custom Date Range
                </button>
                <button
                  onClick={() => {
                    setPeriodFilterMode("all_periods");
                    setPage(1);
                  }}
                  className={`px-3 py-1 font-semibold rounded-lg transition-all ${
                    periodFilterMode === "all_periods"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Historical Periods
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchRecords()}
                  disabled={isRefetchingRecords}
                  className="h-8 text-xs"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-1.5 ${isRefetchingRecords ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>

                {canCalculate && periodFilterMode === "period" && (
                  <Button
                    size="sm"
                    onClick={() => calculateMutation.mutate()}
                    disabled={!selectedPeriodId || calculateMutation.isPending}
                    className="h-8 text-xs bg-primary text-primary-foreground font-semibold"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    {calculateMutation.isPending
                      ? "Computing..."
                      : "Run Batch Calculation"}
                  </Button>
                )}
              </div>
            </div>

            {/* Sub-bar based on Filter Mode */}
            {periodFilterMode === "period" && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                  Select Period:
                </span>
                {periods.map((p) => {
                  const pId = p._id || p.id;
                  const isSelected = pId === selectedPeriodId;
                  return (
                    <button
                      key={pId}
                      onClick={() => {
                        setSelectedPeriodId(pId || "");
                        setSelectedMonthYear(p.monthYear);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shrink-0 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p.monthYear}
                    </button>
                  );
                })}

                {canCalculate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => createPeriodMutation.mutate()}
                    disabled={createPeriodMutation.isPending}
                    className="h-8 text-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    New Period
                  </Button>
                )}
              </div>
            )}

            {periodFilterMode === "custom_range" && (
              <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">From:</span>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">To:</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs w-36"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground italic">
                  Note: Custom date range is for reporting and inspection only. Payroll processing requires an explicit monthly period.
                </span>
              </div>
            )}
          </div>

          {/* Records Table Card */}
          {isPeriodsError && (
            <div
              role="alert"
              className="mb-4 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <span>{getErrorMessage(periodsError, "Could not load payroll periods.")}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPeriodsFetching}
                onClick={() => refetchPeriods()}
              >
                {isPeriodsFetching ? "Retrying..." : "Retry periods"}
              </Button>
            </div>
          )}
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
            {/* Table Search & Status Filter Header */}
            <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search staff name or code..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs border rounded-lg px-2 bg-background text-foreground"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Drafts</option>
                  <option value="pending_approval">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled/Reversed</option>
                </select>
              </div>

              <div className="text-xs text-muted-foreground">
                Showing <strong>{records.length}</strong> of{" "}
                <strong>{pagination.total}</strong> records
              </div>
            </div>

            {/* Main Table */}
            {isRecordsError ? (
              <ErrorState
                className="my-4"
                title="Failed to load payroll records"
                description={getErrorMessage(recordsError, "Could not retrieve payroll records.")}
                retryAction={{
                  label: "Retry payroll records",
                  onClick: () => refetchRecords(),
                  isLoading: isRefetchingRecords,
                }}
              />
            ) : isLoadingRecords ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Loading payroll records...
              </div>
            ) : records.length === 0 ? (
              <div className="py-20 text-center text-xs text-muted-foreground space-y-2">
                <div>No payroll records found for the selected criteria.</div>
                {canCalculate && periodFilterMode === "period" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => calculateMutation.mutate()}
                    className="h-8 text-xs mt-2"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" /> Run Calculation Now
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Attendance & Leaves</TableHead>
                    <TableHead>Prorated Base</TableHead>
                    <TableHead>Adjustments</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => {
                    const recId = r._id || r.id || "";
                    const staff =
                      typeof r.staffId === "object" ? r.staffId : null;
                    const att = r.attendanceSummarySnapshot;
                    const netAdj =
                      (r.calculations.totalAdjustmentsEarning || 0) -
                      (r.calculations.totalAdjustmentsDeduction || 0);

                    return (
                      <TableRow key={recId} className="hover:bg-muted/30">
                        <TableCell>
                          <Link
                            href={`/employees/${staff?._id || ""}`}
                            className="font-semibold text-foreground text-xs hover:text-primary transition-colors underline-offset-2 hover:underline block"
                          >
                            {staff?.name}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">
                            {staff?.designation} •{" "}
                            <span className="font-mono">
                              {staff?.staffCode}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs">
                          {r.monthYear}
                        </TableCell>

                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <div className="font-mono text-[11px]">
                              <span className="font-semibold text-emerald-600">
                                {att.presentDays}
                              </span>{" "}
                              / {att.eligibleDays} days present
                            </div>
                            {att.unpaidLeaveDays > 0 && (
                              <div className="text-red-500 font-semibold text-[10px]">
                                {att.unpaidLeaveDays} unpaid leave day(s)
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs">
                          ₹{r.calculations.grossBaseSalary.toLocaleString()}
                        </TableCell>

                        <TableCell className="font-mono text-xs">
                          {netAdj !== 0 ? (
                            <span
                              className={
                                netAdj > 0 ? "text-emerald-600" : "text-red-500"
                              }
                            >
                              {netAdj > 0 ? "+" : ""}₹{netAdj.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="font-mono text-sm font-bold text-foreground">
                          ₹{r.calculations.netPayable.toLocaleString()}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div>
                              {getStatusBadge(r.status, r.approvalBlocked)}
                            </div>
                            {(r.incentiveLedgerGrossInPaise || 0) > 0 && (
                              <div
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                  r.status === "paid"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : r.status === "cancelled"
                                      ? "border-neutral-200 bg-neutral-50 text-neutral-600"
                                      : r.status === "approved"
                                        ? "border-blue-200 bg-blue-50 text-blue-700"
                                        : "border-amber-200 bg-amber-50 text-amber-800"
                                }`}
                                aria-label={`Commission allocation ${r.status === "paid" ? "settled" : r.status === "cancelled" ? "reversed" : r.status === "approved" ? "approved and awaiting settlement" : "pending payroll approval"}`}
                              >
                                Commission · {r.status === "paid"
                                  ? "Settled"
                                  : r.status === "cancelled"
                                    ? "Reversed"
                                    : r.status === "approved"
                                      ? "Approved"
                                      : "Pending approval"}{" "}
                                · ₹{((r.incentiveLedgerAmountInPaise || 0) / 100).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            )}
                            {r.approvalBlocked && (
                              <div className="text-[10px] text-destructive leading-tight max-w-xs">
                                {r.approvalBlockReasons[0]}
                              </div>
                            )}
                            {r.status === "approved" && (
                              <div className="text-[10px] text-muted-foreground">
                                {r.manualPaymentStatus === "recorded"
                                  ? "Payment recorded · confirmation pending"
                                  : r.manualPaymentStatus === "failed"
                                    ? "Payment failed · retry available"
                                    : "Not settled"}
                              </div>
                            )}
                            {r.status === "paid" && r.disbursedAt && (
                              <div className="text-[10px] text-emerald-700">
                                Confirmed {new Date(r.disbursedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right space-x-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setInspectingRecord(r)}
                            className="h-7 text-xs px-2"
                          >
                            Breakdown
                          </Button>

                          {/* Adjustment on draft */}
                          {canAdjust && r.status === "draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAdjustingRecord(r);
                                setAdjAmount("");
                                setAdjReason("");
                                setAdjRef("");
                              }}
                              className="h-7 text-xs px-2"
                            >
                              <FilePenLine className="w-3.5 h-3.5 mr-1" /> Adjust
                            </Button>
                          )}

                          {/* Approval button */}
                          {canApprove &&
                            (r.status === "draft" ||
                              r.status === "pending_approval") && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  r.approvalBlocked || approveMutation.isPending
                                }
                                onClick={() => approveMutation.mutate(recId)}
                                className="h-7 text-xs text-emerald-700 hover:text-emerald-800"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                Approve
                              </Button>
                            )}

                          {/* Disburse payment */}
                          {canDisburse && r.status === "approved" && (
                            <Button
                              size="sm"
                              variant={r.manualPaymentStatus === "recorded" ? "default" : "outline"}
                              disabled={recordPaymentMutation.isPending || confirmPaymentMutation.isPending}
                              onClick={() => setPayingRecord(r)}
                              title={
                                r.manualPaymentStatus === "recorded"
                                  ? "Verify actual settlement and confirm"
                                  : "Record a payment attempt"
                              }
                              className="h-7 text-xs"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              {r.manualPaymentStatus === "recorded"
                                ? "Confirm payment"
                                : r.manualPaymentStatus === "failed"
                                  ? "Retry payment"
                                  : "Record payment"}
                            </Button>
                          )}

                          {/* Paid payslip & reversal */}
                          {r.status === "paid" && (
                            <>
                              {canExport && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    payrollApi.downloadPayslipPdf(
                                      recId,
                                      `payslip-${r.monthYear}-${staff?.staffCode || "staff"}.pdf`,
                                    )
                                  }
                                  className="h-7 text-xs px-2"
                                >
                                  <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                                </Button>
                              )}

                              {canReverse && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setReversingRecord(r)}
                                  className="h-7 text-xs px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* Server Pagination Footer */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Page <strong>{pagination.page}</strong> of{" "}
                  <strong>{pagination.totalPages}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-7 text-xs px-2.5"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(pagination.totalPages, p + 1))
                    }
                    className="h-7 text-xs px-2.5"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Calculation Breakdown Modal */}
          <CalculationBreakdownDialog
            record={inspectingRecord}
            isOpen={!!inspectingRecord}
            onClose={() => setInspectingRecord(null)}
            onDownloadPdf={() =>
              inspectingRecord &&
              payrollApi.downloadPayslipPdf(
                inspectingRecord._id || inspectingRecord.id || "",
                `payslip-${inspectingRecord.monthYear}.pdf`,
              )
            }
          />

          <PayrollPaymentDialog
            key={payingRecord?._id || payingRecord?.id || "closed"}
            isOpen={!!payingRecord}
            record={payingRecord}
            initialAttempt={payingRecord?.latestPaymentAttempt}
            isRecording={recordPaymentMutation.isPending}
            isConfirming={confirmPaymentMutation.isPending}
            isFailing={failPaymentMutation.isPending}
            onClose={() => setPayingRecord(null)}
            onRecord={async (data) => {
              const result = await recordPaymentMutation.mutateAsync({
                id: payingRecord?._id || payingRecord?.id || "",
                data,
              });
              if (!result.payment) throw new Error("Payment attempt was not returned by the server");
              return result.payment;
            }}
            onConfirm={async (paymentId) => {
              await confirmPaymentMutation.mutateAsync({
                recordId: payingRecord?._id || payingRecord?.id || "",
                paymentId,
              });
            }}
            onFail={async (paymentId, failureReason) => {
              const result = await failPaymentMutation.mutateAsync({
                recordId: payingRecord?._id || payingRecord?.id || "",
                paymentId,
                failureReason,
              });
              if (!result.payment) throw new Error("Failed payment attempt was not returned by the server");
              return result.payment;
            }}
          />

          {/* Manual Adjustment Modal */}
          {adjustingRecord && (
            <Dialog
              isOpen={!!adjustingRecord}
              onClose={() => setAdjustingRecord(null)}
              title="Add Manual Payroll Adjustment"
              maxWidth="md"
            >
              <div className="space-y-4 pt-2 text-xs">
                <p className="text-muted-foreground">
                  Record an authorized adjustment for{" "}
                  <strong>
                    {typeof adjustingRecord.staffId === "object"
                      ? adjustingRecord.staffId.name
                      : "Staff"}
                  </strong>{" "}
                  ({adjustingRecord.monthYear}). Totals will be recalculated automatically with a permanent audit trail.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Adjustment Type</label>
                    <select
                      value={adjType}
                      onChange={(e) =>
                        setAdjType(e.target.value as "earning" | "deduction")
                      }
                      className="w-full h-8 text-xs border rounded-lg px-2 bg-background"
                    >
                      <option value="earning">Earning (+)</option>
                      <option value="deduction">Deduction (-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Amount (₹)</label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="e.g. 1500"
                      value={adjAmount}
                      onChange={(e) => setAdjAmount(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Mandatory Reason / Justification</label>
                  <Input
                    type="text"
                    placeholder="e.g. Approved shift incentive / uniform charge"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Supporting Reference (Optional)</label>
                  <Input
                    type="text"
                    placeholder="e.g. Ticket #4820 or HR email ref"
                    value={adjRef}
                    onChange={(e) => setAdjRef(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustingRecord(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground font-semibold"
                    disabled={
                      !adjAmount ||
                      parseFloat(adjAmount) <= 0 ||
                      adjReason.trim().length < 3 ||
                      addAdjustmentMutation.isPending
                    }
                    onClick={() =>
                      addAdjustmentMutation.mutate({
                        id: adjustingRecord._id || adjustingRecord.id || "",
                        type: adjType,
                        amount: parseFloat(adjAmount),
                        reason: adjReason,
                        reference: adjRef || undefined,
                      })
                    }
                  >
                    {addAdjustmentMutation.isPending
                      ? "Recording..."
                      : "Save Adjustment"}
                  </Button>
                </div>
              </div>
            </Dialog>
          )}

          {/* Payment Reversal Modal */}
          {reversingRecord && (
            <Dialog
              isOpen={!!reversingRecord}
              onClose={() => setReversingRecord(null)}
              title="Reverse Paid Payroll Record"
              maxWidth="md"
            >
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Warning:</strong> Reversing a paid payroll record
                    cancels the payout entry and marks it as{" "}
                    <strong>CANCELLED</strong> in the audit logs.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold block text-foreground mb-1">
                    Audited Reversal Reason (Mandatory)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Disputed attendance punch requires recalculation"
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReversingRecord(null)}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={
                      reversalReason.trim().length < 5 ||
                      reverseMutation.isPending
                    }
                    onClick={() =>
                      reverseMutation.mutate({
                        id: reversingRecord._id || reversingRecord.id || "",
                        reversalReason,
                      })
                    }
                  >
                    {reverseMutation.isPending
                      ? "Reversing..."
                      : "Confirm Cancellation"}
                  </Button>
                </div>
              </div>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}
