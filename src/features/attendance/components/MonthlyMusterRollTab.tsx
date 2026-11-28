"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { Dialog } from "@/components/ui/dialog";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyMusterRoll } from "../hooks/useAttendance";
import { bulkAdjustAttendanceRecords } from "../api/attendance.api";

interface MonthlyMusterRollTabProps {
  currentBranchId: string | null;
  isAllBranchesSelected: boolean;
}

export default function MonthlyMusterRollTab({
  currentBranchId,
  isAllBranchesSelected,
}: MonthlyMusterRollTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const urlMonth = searchParams.get("month");
  const isValidMonth =
    Boolean(urlMonth) &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(urlMonth!) &&
    urlMonth! <= currentMonthStr;

  const monthYear = isValidMonth ? urlMonth! : currentMonthStr;

  const setMonthYear = (nextMonth: string) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(nextMonth)) return;
    const clamped = nextMonth > currentMonthStr ? currentMonthStr : nextMonth;
    const params = new URLSearchParams(searchParams.toString());
    if (clamped === currentMonthStr) {
      params.delete("month");
    } else {
      params.set("month", clamped);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const shiftMonth = (delta: number) => {
    const [y, m] = monthYear.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setMonthYear(next);
  };
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reconcileItems, setReconcileItems] = useState<
    Array<{
      staffId: string;
      staffName: string;
      staffCode: string;
      date: string;
    }>
  >([]);
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({});
  const [targetStatus, setTargetStatus] = useState<"present" | "absent">(
    "present",
  );
  const [reconcileReason, setReconcileReason] = useState("");
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const openReconcileDialog = (
    items: Array<{
      staffId: string;
      staffName: string;
      staffCode: string;
      date: string;
    }>,
  ) => {
    setReconcileItems(items);
    const initial: Record<string, boolean> = {};
    items.forEach((item) => {
      initial[`${item.staffId}:${item.date}`] = true;
    });
    setSelectedKeys(initial);
    setTargetStatus("present");
    setReconcileReason("");
    setReconcileError(null);
  };

  const handleBulkReconcile = async () => {
    const selected = reconcileItems.filter(
      (item) => selectedKeys[`${item.staffId}:${item.date}`],
    );
    if (selected.length === 0) {
      setReconcileError("Select at least one incomplete day.");
      return;
    }
    if (reconcileReason.trim().length < 3) {
      setReconcileError("Please enter a reason (at least 3 characters).");
      return;
    }
    setIsReconciling(true);
    setReconcileError(null);
    try {
      await bulkAdjustAttendanceRecords({
        items: selected.map(({ staffId, date }) => ({ staffId, date })),
        status: targetStatus,
        reason: reconcileReason.trim(),
      });
      setReconcileItems([]);
      await refetch();
    } catch (err) {
      setReconcileError(
        err instanceof Error ? err.message : "Failed to reconcile records.",
      );
    } finally {
      setIsReconciling(false);
    }
  };

  const branchParam = isAllBranchesSelected
    ? "all"
    : currentBranchId || undefined;

  const { data, isLoading, isError, error, refetch } = useMonthlyMusterRoll({
    monthYear,
    branchId: branchParam,
    search: debouncedSearch,
    status: statusFilter,
  });

  const totals = data?.consolidatedTotals;

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    monthYear !== currentMonthStr;

  const resetFilters = () => {
    setMonthYear(currentMonthStr);
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-5">
      {/* Filters Toolbar */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-full items-center gap-1 sm:w-auto shrink-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous month"
                className="h-9 w-9 shrink-0"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="relative flex-1 sm:w-40 sm:flex-none">
                <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label="Select month"
                  type="month"
                  max={currentMonthStr}
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next month"
                className="h-9 w-9 shrink-0"
                disabled={monthYear >= currentMonthStr}
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative min-w-50 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search staff"
                className="h-9 pl-9 pr-8"
                placeholder="Search staff name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="w-full sm:w-42.5 shrink-0">
              <Select
                aria-label="Filter status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full"
              >
                <option value="all">All statuses</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="early_departure">Early exit</option>
                <option value="incomplete">Incomplete</option>
                <option value="absent">Absent</option>
                <option value="leave">On Leave</option>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Active Staff</p>
              <p className="mt-1 text-xl font-bold">{totals.totalStaff}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
            <CardContent className="p-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Present Days
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-300">
                {totals.presentDays}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200">
            <CardContent className="p-3">
              <p className="text-xs text-orange-700 dark:text-orange-400">
                Late Arrivals
              </p>
              <p className="mt-1 text-xl font-bold text-orange-800 dark:text-orange-300">
                {totals.lateDays}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
            <CardContent className="p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Early Exits
              </p>
              <p className="mt-1 text-xl font-bold text-amber-800 dark:text-amber-300">
                {totals.earlyDepartureDays}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
            <CardContent className="p-3">
              <p className="text-xs text-purple-700 dark:text-purple-400">
                Paid Leave
              </p>
              <p className="mt-1 text-xl font-bold text-purple-800 dark:text-purple-300">
                {totals.approvedPaidLeaveDays}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-rose-50 dark:bg-rose-950/30 border-rose-200">
            <CardContent className="p-3">
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Unpaid / Loss
              </p>
              <p className="mt-1 text-xl font-bold text-rose-800 dark:text-rose-300">
                {totals.approvedUnpaidLeaveDays}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/30 border-red-200">
            <CardContent className="p-3">
              <p className="text-xs text-red-700 dark:text-red-400">
                Absent Days
              </p>
              <p className="mt-1 text-xl font-bold text-red-800 dark:text-red-300">
                {totals.absentDays}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Grid View */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <span>Monthly Muster Roll Summary ({monthYear})</span>
            <div className="flex items-center gap-2">
              {!isAllBranchesSelected &&
                totals &&
                totals.incompleteDays > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    onClick={() => {
                      const allIncomplete: Array<{
                        staffId: string;
                        staffName: string;
                        staffCode: string;
                        date: string;
                      }> = [];
                      (
                        (data?.musterRoll || []) as Array<{
                          staff: {
                            _id: string;
                            name: string;
                            staffCode: string;
                          };
                          dailyBreakdown?: Record<
                            string,
                            { status: string; date: string }
                          >;
                        }>
                      ).forEach((row) => {
                        (
                          Object.values(row.dailyBreakdown || {}) as Array<{
                            status: string;
                            date: string;
                          }>
                        ).forEach((day) => {
                          if (day.status === "incomplete") {
                            allIncomplete.push({
                              staffId: row.staff._id,
                              staffName: row.staff.name,
                              staffCode: row.staff.staffCode,
                              date: day.date,
                            });
                          }
                        });
                      });
                      openReconcileDialog(allIncomplete);
                    }}
                  >
                    <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                    Reconcile All ({totals.incompleteDays})
                  </Button>
                )}
              {isAllBranchesSelected && (
                <Badge
                  variant="outline"
                  className="text-xs text-blue-600 bg-blue-50 border-blue-200"
                >
                  Consolidated All Authorized Branches
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {isError && (
            <div className="p-6">
              <ErrorState
                title="Could not load Monthly Muster Roll"
                description={
                  error instanceof Error
                    ? error.message
                    : "An unexpected error occurred."
                }
                retryAction={{
                  label: "Retry",
                  onClick: () => refetch(),
                }}
              />
            </div>
          )}

          {!isLoading &&
            !isError &&
            (!data?.musterRoll || data.musterRoll.length === 0) && (
              <div className="p-6">
                <EmptyState
                  title="No attendance records found"
                  description={`No active staff attendance records for the month ${monthYear}.`}
                />
              </div>
            )}

          {!isLoading &&
            !isError &&
            data?.musterRoll &&
            data.musterRoll.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                      <th className="p-3 min-w-45">Staff Member</th>
                      <th className="p-3 text-center">Eligible</th>
                      <th className="p-3 text-center text-emerald-700">
                        Present
                      </th>
                      <th className="p-3 text-center text-orange-700">Late</th>
                      <th className="p-3 text-center text-amber-700">
                        Early Exit
                      </th>
                      <th className="p-3 text-center text-purple-700">
                        Paid Leave
                      </th>
                      <th className="p-3 text-center text-rose-700">Unpaid</th>
                      <th className="p-3 text-center text-red-700">Absent</th>
                      <th className="p-3 text-center">Incomplete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.musterRoll.map(
                      (row: {
                        staff: {
                          _id: string;
                          name: string;
                          staffCode: string;
                          designation?: string;
                        };
                        metrics: {
                          eligibleDays: number;
                          presentDays: number;
                          lateDays: number;
                          earlyDepartureDays: number;
                          approvedPaidLeaveDays: number;
                          approvedUnpaidLeaveDays: number;
                          absentDays: number;
                          incompleteDays: number;
                        };
                        dailyBreakdown?: Record<
                          string,
                          { status: string; date: string }
                        >;
                      }) => (
                        <tr
                          key={row.staff._id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3">
                            <div className="font-medium text-foreground">
                              {row.staff.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {row.staff.staffCode} • {row.staff.designation}
                            </div>
                          </td>
                          <td className="p-3 text-center font-medium">
                            {row.metrics.eligibleDays}
                          </td>
                          <td className="p-3 text-center font-semibold text-emerald-700">
                            {row.metrics.presentDays}
                          </td>
                          <td className="p-3 text-center text-orange-700">
                            {row.metrics.lateDays > 0 ? (
                              <Badge
                                variant="outline"
                                className="border-orange-200 bg-orange-50 text-orange-800"
                              >
                                {row.metrics.lateDays}
                              </Badge>
                            ) : (
                              "0"
                            )}
                          </td>
                          <td className="p-3 text-center text-amber-700">
                            {row.metrics.earlyDepartureDays > 0 ? (
                              <Badge
                                variant="outline"
                                className="border-amber-200 bg-amber-50 text-amber-800"
                              >
                                {row.metrics.earlyDepartureDays}
                              </Badge>
                            ) : (
                              "0"
                            )}
                          </td>
                          <td className="p-3 text-center text-purple-700 font-medium">
                            {row.metrics.approvedPaidLeaveDays}
                          </td>
                          <td className="p-3 text-center text-rose-700">
                            {row.metrics.approvedUnpaidLeaveDays}
                          </td>
                          <td className="p-3 text-center text-red-700 font-semibold">
                            {row.metrics.absentDays}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center justify-center gap-2">
                              <span
                                className={
                                  row.metrics.incompleteDays > 0
                                    ? "font-semibold text-amber-700"
                                    : "text-muted-foreground"
                                }
                              >
                                {row.metrics.incompleteDays}
                              </span>
                              {!isAllBranchesSelected &&
                                row.metrics.incompleteDays > 0 && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                                    onClick={() => {
                                      const staffIncomplete = (
                                        Object.values(
                                          row.dailyBreakdown || {},
                                        ) as Array<{
                                          status: string;
                                          date: string;
                                        }>
                                      )
                                        .filter(
                                          (d) => d.status === "incomplete",
                                        )
                                        .map((d) => ({
                                          staffId: row.staff._id,
                                          staffName: row.staff.name,
                                          staffCode: row.staff.staffCode,
                                          date: d.date,
                                        }));
                                      openReconcileDialog(staffIncomplete);
                                    }}
                                  >
                                    Reconcile
                                  </Button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </CardContent>
      </Card>

      <Dialog
        isOpen={reconcileItems.length > 0}
        onClose={() => setReconcileItems([])}
        title={`Reconcile Incomplete Days (${reconcileItems.length})`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Select the incomplete days to reconcile before running payroll.
          </p>

          <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
            {reconcileItems.map((item) => {
              const key = `${item.staffId}:${item.date}`;
              return (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedKeys[key])}
                      onChange={(e) =>
                        setSelectedKeys((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    <span className="font-medium">{item.staffName}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.staffCode}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.date}
                  </Badge>
                </label>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">
                Target Status
              </label>
              <Select
                value={targetStatus}
                onChange={(e) =>
                  setTargetStatus(e.target.value as "present" | "absent")
                }
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium">
                Reason (required)
              </label>
              <Input
                value={reconcileReason}
                onChange={(e) => setReconcileReason(e.target.value)}
                placeholder="e.g. Biometric device missed out-punch"
              />
            </div>
          </div>

          {reconcileError && (
            <p className="text-xs text-destructive">{reconcileError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReconcileItems([])}
              disabled={isReconciling}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBulkReconcile}
              disabled={isReconciling}
            >
              {isReconciling ? "Reconciling..." : "Confirm Reconcile"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
