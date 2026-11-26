"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Clock, RotateCcw, Search, UserCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyMusterRoll } from "../hooks/useAttendance";

interface MonthlyMusterRollTabProps {
  currentBranchId: string | null;
  isAllBranchesSelected: boolean;
}

export default function MonthlyMusterRollTab({
  currentBranchId,
  isAllBranchesSelected,
}: MonthlyMusterRollTabProps) {
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [monthYear, setMonthYear] = useState<string>(currentMonthStr);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const branchParam = isAllBranchesSelected ? "all" : currentBranchId || undefined;

  const { data, isLoading, isError, error, refetch } = useMonthlyMusterRoll({
    monthYear,
    branchId: branchParam,
    search,
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-[170px_minmax(220px,1fr)_180px]">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label="Select month"
                  type="month"
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>

              <div className="relative">
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
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Present Days</p>
              <p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-300">
                {totals.presentDays}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200">
            <CardContent className="p-3">
              <p className="text-xs text-orange-700 dark:text-orange-400">Late Arrivals</p>
              <p className="mt-1 text-xl font-bold text-orange-800 dark:text-orange-300">
                {totals.lateDays}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
            <CardContent className="p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">Early Exits</p>
              <p className="mt-1 text-xl font-bold text-amber-800 dark:text-amber-300">
                {totals.earlyDepartureDays}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
            <CardContent className="p-3">
              <p className="text-xs text-purple-700 dark:text-purple-400">Paid Leave</p>
              <p className="mt-1 text-xl font-bold text-purple-800 dark:text-purple-300">
                {totals.approvedPaidLeaveDays}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-rose-50 dark:bg-rose-950/30 border-rose-200">
            <CardContent className="p-3">
              <p className="text-xs text-rose-700 dark:text-rose-400">Unpaid / Loss</p>
              <p className="mt-1 text-xl font-bold text-rose-800 dark:text-rose-300">
                {totals.approvedUnpaidLeaveDays}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/30 border-red-200">
            <CardContent className="p-3">
              <p className="text-xs text-red-700 dark:text-red-400">Absent Days</p>
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
          <CardTitle className="text-base flex items-center justify-between">
            <span>Monthly Muster Roll Summary ({monthYear})</span>
            {isAllBranchesSelected && (
              <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50 border-blue-200">
                Consolidated All Authorized Branches
              </Badge>
            )}
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
                description={error instanceof Error ? error.message : "An unexpected error occurred."}
                retryAction={{
                  label: "Retry",
                  onClick: () => refetch(),
                }}
              />
            </div>
          )}

          {!isLoading && !isError && (!data?.musterRoll || data.musterRoll.length === 0) && (
            <div className="p-6">
              <EmptyState
                title="No attendance records found"
                description={`No active staff attendance records for the month ${monthYear}.`}
              />
            </div>
          )}

          {!isLoading && !isError && data?.musterRoll && data.musterRoll.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                    <th className="p-3 min-w-[180px]">Staff Member</th>
                    <th className="p-3 text-center">Eligible</th>
                    <th className="p-3 text-center text-emerald-700">Present</th>
                    <th className="p-3 text-center text-orange-700">Late</th>
                    <th className="p-3 text-center text-amber-700">Early Exit</th>
                    <th className="p-3 text-center text-purple-700">Paid Leave</th>
                    <th className="p-3 text-center text-rose-700">Unpaid</th>
                    <th className="p-3 text-center text-red-700">Absent</th>
                    <th className="p-3 text-center">Incomplete</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.musterRoll.map((row) => (
                    <tr key={row.staff._id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{row.staff.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {row.staff.staffCode} • {row.staff.designation}
                        </div>
                      </td>
                      <td className="p-3 text-center font-medium">{row.metrics.eligibleDays}</td>
                      <td className="p-3 text-center font-semibold text-emerald-700">
                        {row.metrics.presentDays}
                      </td>
                      <td className="p-3 text-center text-orange-700">
                        {row.metrics.lateDays > 0 ? (
                          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-800">
                            {row.metrics.lateDays}
                          </Badge>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="p-3 text-center text-amber-700">
                        {row.metrics.earlyDepartureDays > 0 ? (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
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
                      <td className="p-3 text-center text-muted-foreground">
                        {row.metrics.incompleteDays}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
