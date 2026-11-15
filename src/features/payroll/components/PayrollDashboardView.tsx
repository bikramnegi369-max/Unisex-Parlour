"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payrollApi, PayrollRecord } from "../api/payroll.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { SalaryStructureManager } from "./SalaryStructureManager";
import { CalculationBreakdownDialog } from "./CalculationBreakdownDialog";
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

  // Disbursal Modal
  const [payingRecord, setPayingRecord] = useState<PayrollRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "bank_transfer" | "cash" | "cheque" | "upi"
  >("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");

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
  const { data: periods = [] } = useQuery({
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

  const payMutation = useMutation({
    mutationFn: ({
      id,
      paymentMethod,
      paymentReference,
    }: {
      id: string;
      paymentMethod: NonNullable<PayrollRecord["paymentMethod"]>;
      paymentReference: string;
    }) => payrollApi.recordPayment(id, { paymentMethod, paymentReference }),
    onSuccess: () => {
      toast.success("Payment disbursed and recorded successfully");
      setPayingRecord(null);
      setPaymentReference("");
      queryClient.invalidateQueries({ queryKey: ["payroll", "records"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to record payment"));
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
            {isLoadingRecords ? (
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
                            {r.approvalBlocked && (
                              <div className="text-[10px] text-destructive leading-tight max-w-xs">
                                {r.approvalBlockReasons[0]}
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
                              onClick={() => setPayingRecord(r)}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              Disburse
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

          {/* Payment Disbursal Confirmation Modal */}
          {payingRecord && (
            <Dialog
              isOpen={!!payingRecord}
              onClose={() => setPayingRecord(null)}
              title="Disburse Payroll Payment"
              maxWidth="md"
            >
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  You are about to record final payment for{" "}
                  <strong>
                    {typeof payingRecord.staffId === "object"
                      ? payingRecord.staffId.name
                      : "Staff"}
                  </strong>
                  . This action marks the record as <strong>PAID</strong> and
                  generates an immutable ledger snapshot.
                </p>

                <div className="p-3 bg-muted/40 rounded-xl border flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    Authorized Net Disbursal:
                  </span>
                  <span className="font-mono font-bold text-base text-foreground">
                    ₹{payingRecord.calculations.netPayable.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold block text-foreground mb-1">
                      Disbursal Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value as NonNullable<
                            PayrollRecord["paymentMethod"]
                          >,
                        )
                      }
                      className="w-full text-xs h-9 border rounded-lg px-3 bg-background"
                    >
                      <option value="bank_transfer">
                        Bank Transfer (NEFT/RTGS)
                      </option>
                      <option value="upi">UPI / Instant Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold block text-foreground mb-1">
                      Payment Reference / UTR Number
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. UTR-20261115-9821"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPayingRecord(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    disabled={!paymentReference.trim() || payMutation.isPending}
                    onClick={() =>
                      payMutation.mutate({
                        id: payingRecord._id || payingRecord.id || "",
                        paymentMethod,
                        paymentReference,
                      })
                    }
                  >
                    {payMutation.isPending
                      ? "Recording..."
                      : "Confirm & Disburse"}
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
