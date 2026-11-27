"use client";

import React, { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  Plus,
  Search,
  Layers,
  Users,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Eye,
  FileText,
  RotateCcw,
  BookOpen,
  DollarSign,
  AlertTriangle,
  Info,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SectionTabs } from "@/components/ui/section-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { incentivesApi } from "../api/incentives.api";
import { SchemeStatusBadge } from "./SchemeStatusBadge";
import { SchemeBuilderDialog } from "./SchemeBuilderDialog";
import { AssignmentDialog } from "./AssignmentDialog";
import { CalculationPreviewDialog } from "./CalculationPreviewDialog";
import { SchemeDetailModal } from "./SchemeDetailModal";
import { LedgerTab } from "./LedgerTab";
import { RecoveryObligationsTab } from "./RecoveryObligationsTab";
import { StaffEarningsTab } from "./StaffEarningsTab";
import { AttendanceBonusPanel } from "./AttendanceBonusPanel";
import {
  CreateIncentiveSchemeRequest,
  IncentiveScheme,
  SchemeAssignmentRequest,
  SchemeAssignment,
  isSupportedIncentiveScheme,
  formatCalculationBasisLabel,
  schemeTypeLabels,
} from "../types/incentives.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/axios";
import { getBranches } from "@/features/branches/api/branches.api";

interface ApiDropdownRecord {
  id?: string;
  _id?: string;
  name: string;
  staffCode?: string;
}

const normalizeDropdownRecord = <T extends ApiDropdownRecord>(
  record: T,
): T & { id: string; _id: string } => {
  const id = record._id || record.id;
  if (!id) {
    throw new Error("Dropdown record is missing its ID.");
  }
  return { ...record, id, _id: record._id || id };
};

const getIncentiveErrorMessage = (error: unknown, fallback: string): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
};

export const IncentivesDashboardView: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();

  const canManage = hasPermission(user, "incentives.rules.manage");
  const canApprove = hasPermission(user, "incentives.approve");
  const canView =
    hasPermission(user, "incentives.view") ||
    hasPermission(user, "incentives.view.all");
  const summaryBranchId =
    currentBranchId && currentBranchId !== "all" ? currentBranchId : undefined;

  const [activeTab, setActiveTab] = useState<
    | "team-earnings"
    | "schemes"
    | "assignments"
    | "ledger"
    | "obligations"
    | "lifecycle"
    | "attendance"
  >("team-earnings");

  const tabs: Array<{
    id:
      | "team-earnings"
      | "schemes"
      | "assignments"
      | "ledger"
      | "obligations"
      | "lifecycle"
      | "attendance";
    label: string;
    icon: React.ReactNode;
    visible?: boolean;
  }> = [
    {
      id: "team-earnings",
      label: "Employee Earnings",
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      id: "schemes",
      label: "Incentive Plans",
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: "assignments",
      label: "Employee Plan Assignments",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      id: "ledger",
      label: "Earnings History",
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      id: "obligations",
      label: "Amounts to Recover",
      icon: <RotateCcw className="w-3.5 h-3.5" />,
    },
    {
      id: "lifecycle",
      label: "Payment & Completion Rules",
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
    {
      id: "attendance",
      label: "Attendance Bonus",
      icon: <CalendarCheck className="w-3.5 h-3.5" />,
      visible: canApprove,
    },
  ];
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<IncentiveScheme | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 1. Fetch Summary Metrics from Authoritative Backend
  const {
    data: summaryMetrics,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    isFetching: isSummaryFetching,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["incentives", "summary", summaryBranchId],
    queryFn: () => incentivesApi.getSummary(summaryBranchId),
    enabled: canView,
  });

  // 2. Fetch Schemes Query
  const {
    data: schemesData,
    isLoading: isSchemesLoading,
    isError: isSchemesError,
    error: schemesError,
    isFetching: isSchemesFetching,
    refetch: refetchSchemes,
  } = useQuery({
    queryKey: [
      "incentives",
      "schemes",
      { page, search: debouncedSearch, statusFilter, typeFilter },
    ],
    queryFn: () =>
      incentivesApi.listSchemes({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        schemeType: typeFilter !== "all" ? typeFilter : undefined,
      }),
    enabled:
      canView && (activeTab === "schemes" || isPreviewOpen || isAssignmentOpen),
  });

  // 3. Fetch Assignments Query
  const {
    data: assignmentsData,
    isLoading: isAssignmentsLoading,
    isError: isAssignmentsError,
    error: assignmentsError,
    isFetching: isAssignmentsFetching,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ["incentives", "assignments"],
    queryFn: () => incentivesApi.listAssignments({ limit: 50 }),
    enabled: canView && activeTab === "assignments",
  });

  // 4. Fetch Staff for Dropdowns
  const { data: staffList = [] } = useQuery({
    queryKey: ["staff", "dropdown", currentBranchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{
          success: boolean;
          data: ApiDropdownRecord[];
        }>("/staff", { params: { branchId: summaryBranchId } });
        return (res.data.data || []).map(normalizeDropdownRecord);
      } catch (error: unknown) {
        toast.error(
          getIncentiveErrorMessage(error, "Could not load eligible staff."),
        );
        throw error;
      }
    },
    retry: false,
    enabled: canView,
  });

  // 5. Fetch Branches for Dropdowns
  const { data: branches = [] } = useQuery({
    queryKey: ["branches", "dropdown", currentBranchId],
    queryFn: async () => {
      try {
        const { branches: branchRecords } = await getBranches();
        return branchRecords.map(normalizeDropdownRecord);
      } catch (error: unknown) {
        toast.error(
          getIncentiveErrorMessage(error, "Could not load available branches."),
        );
        throw error;
      }
    },
    retry: false,
    enabled: canView,
  });

  // Mutations
  const createSchemeMutation = useMutation({
    mutationFn: (values: CreateIncentiveSchemeRequest) =>
      incentivesApi.createScheme(values),
    onSuccess: () => {
      toast.success("Incentive scheme created successfully in draft status");
      setIsBuilderOpen(false);
      queryClient.invalidateQueries({ queryKey: ["incentives", "schemes"] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "summary"] });
    },
    onError: (err: unknown) => {
      toast.error(getIncentiveErrorMessage(err, "Failed to create scheme"));
    },
  });

  const activateSchemeMutation = useMutation({
    mutationFn: (id: string) => incentivesApi.activateScheme(id),
    onSuccess: () => {
      toast.success("Scheme activated successfully");
      setIsDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ["incentives", "schemes"] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "summary"] });
    },
    onError: (err: unknown) =>
      toast.error(getIncentiveErrorMessage(err, "Failed to activate scheme")),
  });

  const pauseSchemeMutation = useMutation({
    mutationFn: (id: string) => incentivesApi.pauseScheme(id),
    onSuccess: () => {
      toast.success("Scheme paused successfully");
      setIsDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ["incentives", "schemes"] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "summary"] });
    },
    onError: (err: unknown) =>
      toast.error(getIncentiveErrorMessage(err, "Failed to pause scheme")),
  });

  const archiveSchemeMutation = useMutation({
    mutationFn: (id: string) => incentivesApi.archiveScheme(id),
    onSuccess: () => {
      toast.success("Scheme archived successfully");
      setIsDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ["incentives", "schemes"] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "summary"] });
    },
    onError: (err: unknown) =>
      toast.error(getIncentiveErrorMessage(err, "Failed to archive scheme")),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (values: SchemeAssignmentRequest) =>
      incentivesApi.createAssignment(values),
    onSuccess: () => {
      toast.success(
        "Scheme assigned successfully under ScopeLock serialization",
      );
      setIsAssignmentOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["incentives", "assignments"],
      });
    },
    onError: (err: unknown) => {
      toast.error(getIncentiveErrorMessage(err, "Failed to assign scheme"));
    },
  });

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          You do not have permission to view or manage Incentives and
          Performance configuration. Contact your salon administrator to request
          access.
        </p>
      </div>
    );
  }

  const schemes = schemesData?.data || [];
  const meta = schemesData?.meta || { total: 0, totalPages: 1 };

  const formatRupees = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format((paise || 0) / 100);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeaderBanner
        title="Incentives & Performance"
        description="Deterministic revenue commission engine, fulfillment dual-gating, ledger auditing, and clawback management."
        icon={TrendingUp}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="gap-1.5 h-9"
            >
              <Calculator className="w-4 h-4 text-primary" /> Live Preview
            </Button>

            {canManage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssignmentOpen(true)}
                  className="gap-1.5 h-9"
                >
                  <Users className="w-4 h-4" /> Assign Scheme
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsBuilderOpen(true)}
                  className="gap-1.5 h-9 bg-primary"
                >
                  <Plus className="w-4 h-4" /> Create Scheme
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Authoritative Metric Cards */}
      {isSummaryError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            {getIncentiveErrorMessage(
              summaryError,
              "Could not load Incentives summary.",
            )}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSummaryFetching}
            onClick={() => refetchSummary()}
          >
            {isSummaryFetching ? "Retrying..." : "Retry summary"}
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Accrued */}
        <Card className="shadow-none border border-neutral-200">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Accrued Commissions
            </CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-zinc-900">
              {isSummaryLoading || isSummaryError
                ? "—"
                : formatRupees(summaryMetrics?.netAccruedPaise || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Accruals minus returns & clawbacks
            </p>
          </CardContent>
        </Card>

        {/* Pending Fulfillment Gate */}
        <Card className="shadow-none border border-neutral-200">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Fulfillment Gate
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">
              {isSummaryLoading || isSummaryError
                ? "—"
                : summaryMetrics?.pendingFulfillmentCount || 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Settled invoices awaiting service completion
            </p>
          </CardContent>
        </Card>

        {/* Outstanding Clawbacks */}
        <Card className="shadow-none border border-neutral-200">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Outstanding Clawbacks
            </CardTitle>
            <RotateCcw className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-red-600">
              {isSummaryLoading || isSummaryError
                ? "—"
                : formatRupees(summaryMetrics?.outstandingRecoveryPaise || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Clawbacks pending recovery in future payouts
            </p>
          </CardContent>
        </Card>

        {/* Active Schemes */}
        <Card className="shadow-none border border-neutral-200">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Scheme Lifecycle
            </CardTitle>
            <Layers className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-zinc-900">
              {isSummaryLoading || isSummaryError
                ? "—"
                : summaryMetrics?.schemes?.active || 0}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {isSummaryLoading || isSummaryError
                  ? ""
                  : `active / ${(summaryMetrics?.schemes?.draft || 0) + (summaryMetrics?.schemes?.active || 0) + (summaryMetrics?.schemes?.paused || 0)} total`}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isSummaryLoading || isSummaryError
                ? "Scheme summary unavailable"
                : `${summaryMetrics?.schemes?.draft || 0} draft • ${summaryMetrics?.schemes?.paused || 0} paused`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Switcher */}
      <SectionTabs
        ariaLabel="Incentives sections"
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        items={tabs
          .filter((tab) => tab.visible !== false)
          .map((tab) => ({
            key: tab.id,
            label: tab.label,
            icon: tab.icon,
          }))}
      />

      {/* TAB 0: TEAM EARNINGS OVERVIEW */}
      {activeTab === "team-earnings" && (
        <StaffEarningsTab staffList={staffList} />
      )}

      {/* TAB 1: SCHEME DIRECTORY */}
      {activeTab === "schemes" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search scheme by name or code..."
                className="pl-8 h-9 text-xs"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="w-35">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>

              <div className="w-40">
                <Select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 text-xs"
                >
                  <option value="all">All Types</option>
                  <option value="COMMISSION">Commission</option>
                  <option value="TARGET_BONUS">Target Bonus</option>
                  <option value="ATTENDANCE_BONUS">Attendance Bonus</option>
                  <option value="HYBRID">Hybrid</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Scheme Table */}
          <div className="border rounded-xl bg-card overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 border-b text-zinc-600 font-medium">
                  <tr>
                    <th className="py-3 px-4">Scheme Details</th>
                    <th className="py-3 px-4">Type & Basis</th>
                    <th className="py-3 px-4">Rules Summary</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-zinc-800">
                  {isSchemesError ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-4">
                        <div
                          role="alert"
                          className="flex flex-col items-center gap-3 text-center"
                        >
                          <span>
                            {getIncentiveErrorMessage(
                              schemesError,
                              "Could not load incentive schemes.",
                            )}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSchemesFetching}
                            onClick={() => refetchSchemes()}
                          >
                            {isSchemesFetching
                              ? "Retrying..."
                              : "Retry schemes"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : isSchemesLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Loading incentive schemes...
                      </td>
                    </tr>
                  ) : schemes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-muted-foreground"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-zinc-900">
                            No incentive schemes found
                          </p>
                          <p className="text-xs">
                            Create your first commission plan to get started.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    schemes.map((s: IncentiveScheme) => (
                      <tr
                        key={s.id}
                        className="hover:bg-zinc-50/70 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900">
                            {s.name}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {s.code}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-900">
                            {schemeTypeLabels[s.schemeType]}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatCalculationBasisLabel(s.calculationBasis)}
                          </div>
                          {!isSupportedIncentiveScheme(s) && (
                            <div className="mt-1 text-[10px] font-medium text-destructive">
                              Unsupported for earnings
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {s.rules?.tiers && s.rules.tiers.length > 0 ? (
                            <span className="font-medium">
                              {s.rules.tiers.length} Graduated Tier
                              {s.rules.tiers.length > 1 ? "s" : ""}
                            </span>
                          ) : s.rules?.fixedAmountPaise > 0 ? (
                            <span>
                              Fixed: ₹
                              {(s.rules.fixedAmountPaise / 100).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Default Rate
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <SchemeStatusBadge status={s.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedScheme(s);
                              setIsDetailOpen(true);
                            }}
                            className="h-8 gap-1 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {meta.totalPages > 1 && (
              <div className="p-3 border-t bg-zinc-50/50 flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Showing {schemes.length} of {meta.total} schemes
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2 font-medium text-zinc-900">
                    Page {page} of {meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGNMENT MANAGEMENT */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="bg-zinc-50 border rounded-lg p-3 text-xs text-zinc-700 flex items-center justify-between">
            <div>
              <strong>Authoritative Scope Precedence:</strong> When evaluating
              commission at settlement, the engine matches <code>STAFF</code>{" "}
              scope first &rarr; falls back to <code>BRANCH</code> &rarr; then{" "}
              <code>ORGANIZATION</code> default. Ambiguous overlapping
              assignments are strictly rejected.
            </div>
            {canManage && (
              <Button
                size="sm"
                onClick={() => setIsAssignmentOpen(true)}
                className="h-8 gap-1 text-xs shrink-0 ml-4"
              >
                <Plus className="w-3.5 h-3.5" /> Assign Scheme
              </Button>
            )}
          </div>

          <div className="border rounded-xl bg-card overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 border-b text-zinc-600 font-medium">
                  <tr>
                    <th className="py-3 px-4">Scheme</th>
                    <th className="py-3 px-4">Scope Level</th>
                    <th className="py-3 px-4">Assigned Entity</th>
                    <th className="py-3 px-4">Validity Interval</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-zinc-800">
                  {isAssignmentsError ? (
                    <tr>
                      <td colSpan={6} className="py-8 px-4">
                        <div
                          role="alert"
                          className="flex flex-col items-center gap-3 text-center"
                        >
                          <span>
                            {getIncentiveErrorMessage(
                              assignmentsError,
                              "Could not load scheme assignments.",
                            )}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isAssignmentsFetching}
                            onClick={() => refetchAssignments()}
                          >
                            {isAssignmentsFetching
                              ? "Retrying..."
                              : "Retry assignments"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : isAssignmentsLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Loading scope assignments...
                      </td>
                    </tr>
                  ) : (assignmentsData?.data || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No active scheme assignments configured.
                      </td>
                    </tr>
                  ) : (
                    (assignmentsData?.data || []).map((a: SchemeAssignment) => {
                      const schemeObj =
                        typeof a.schemeId === "object" ? a.schemeId : null;
                      const assignedStaff =
                        a.scopeType === "STAFF"
                          ? staffList.find(
                              (staff: {
                                _id?: string;
                                id?: string;
                                name?: string;
                              }) =>
                                String(staff._id || staff.id) ===
                                String(a.scopeId),
                            )
                          : null;
                      const assignedBranch =
                        a.scopeType === "BRANCH"
                          ? branches.find(
                              (branch: {
                                _id?: string;
                                id?: string;
                                name?: string;
                              }) =>
                                String(branch._id || branch.id) ===
                                String(a.scopeId),
                            )
                          : null;
                      return (
                        <tr key={a.id} className="hover:bg-zinc-50/70">
                          <td className="py-3 px-4 font-semibold text-zinc-900">
                            {schemeObj?.name || "Assigned Scheme"}
                            {schemeObj?.code && (
                              <div className="text-[11px] font-mono text-muted-foreground">
                                {schemeObj.code}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className="font-semibold text-[10px]"
                            >
                              {a.scopeType}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {a.scopeType === "ORGANIZATION" ? (
                              <span className="text-muted-foreground">
                                Tenant-wide Default
                              </span>
                            ) : a.scopeType === "STAFF" ? (
                              assignedStaff ? (
                                <span className="font-sans text-xs text-zinc-900">
                                  {assignedStaff.name}
                                  {assignedStaff.staffCode && (
                                    <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                                      ({assignedStaff.staffCode})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Staff record unavailable
                                </span>
                              )
                            ) : a.scopeType === "BRANCH" ? (
                              assignedBranch ? (
                                <span className="font-sans text-xs text-zinc-900">
                                  {assignedBranch.name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Branch record unavailable
                                </span>
                              )
                            ) : (
                              a.scopeId || "N/A"
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {new Date(a.startDate).toLocaleDateString()} &ndash;{" "}
                            {a.endDate
                              ? new Date(a.endDate).toLocaleDateString()
                              : "Ongoing"}
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            {a.priority}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                a.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-zinc-100 text-zinc-600"
                              }
                            >
                              {a.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMMUTABLE EARNINGS LEDGER */}
      {activeTab === "ledger" && (
        <LedgerTab staffList={staffList} branches={branches} />
      )}

      {/* TAB 4: RECOVERY OBLIGATIONS */}
      {activeTab === "obligations" && (
        <RecoveryObligationsTab staffList={staffList} />
      )}

      {/* TAB 5: LIFECYCLE & GATE RULES */}
      {activeTab === "lifecycle" && (
        <div className="space-y-6">
          <Card className="rounded-xl border-neutral-200 p-6 space-y-4 bg-white">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  Incentive Settlement & Dual-Gate Architecture
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  How revenue commissions are accrued, verified, and settled in
                  Unisex Parlour ERP.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-2">
                <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  Financial Settlement Gate
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Incentives are created only when an invoice reaches full
                  financial settlement. Unpaid, pending, or partial invoices
                  never accrue commissions.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-2">
                <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  Physical Fulfillment Gate
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  For service line items, verified execution is required.
                  Entries begin with{" "}
                  <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-mono">
                    pending
                  </code>{" "}
                  fulfillment status and only unlock for payroll upon confirmed
                  completion.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-2">
                <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  Clawbacks & Recovery
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Invoice voids or product returns produce immutable{" "}
                  <code className="text-red-700 bg-red-50 px-1 py-0.5 rounded font-mono">
                    CLAWBACK
                  </code>{" "}
                  entries. Outstanding amounts form recovery obligations that
                  persist across payout cycles.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-amber-700" /> Boundary
                Notice: Incentives vs. Payroll
              </p>
              <p className="text-amber-800 leading-relaxed">
                The Incentives calculation engine is purely authoritative for
                commission accrual and recovery tracking. Monthly payout
                batches, salary disbursements, and tax deductions are handled
                separately by the Payroll domain.
              </p>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "attendance" && canApprove && (
        <AttendanceBonusPanel
          key={currentBranchId ?? "no-branch"}
          branchId={currentBranchId}
          staffList={staffList}
          canApprove={canApprove}
        />
      )}

      {/* DIALOGS */}
      <SchemeBuilderDialog
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSubmit={async (values) => {
          await createSchemeMutation.mutateAsync(values);
        }}
        isSubmitting={createSchemeMutation.isPending}
      />

      <AssignmentDialog
        isOpen={isAssignmentOpen}
        onClose={() => setIsAssignmentOpen(false)}
        onSubmit={async (values) => {
          await createAssignmentMutation.mutateAsync(values);
        }}
        schemes={schemes}
        staffList={staffList}
        branches={branches}
        isSubmitting={createAssignmentMutation.isPending}
      />

      <CalculationPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onPreview={async (values) => {
          return await incentivesApi.previewCalculation(values);
        }}
        schemes={schemes}
        staffList={staffList}
      />

      <SchemeDetailModal
        scheme={selectedScheme}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        canManage={canManage}
        onActivate={(id) => activateSchemeMutation.mutate(id)}
        onPause={(id) => pauseSchemeMutation.mutate(id)}
        onArchive={(id) => archiveSchemeMutation.mutate(id)}
      />
    </div>
  );
};
