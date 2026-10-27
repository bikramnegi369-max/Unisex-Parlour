"use client";

import React from "react";
import {
  RotateCcw,
  Search,
  Building2,
  RefreshCw,
  Loader2,
  Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Employee } from "@/features/employees/types/employee.types";

interface LeaveFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  staffId: string;
  onStaffIdChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onClear: () => void;
  activeScopeName?: string;
  isRefetching?: boolean;
  totalResults?: number;
}

export default function LeaveFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  staffId,
  onStaffIdChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClear,
  activeScopeName,
  isRefetching,
  totalResults,
}: LeaveFiltersProps) {
  const { user } = useAuth();
  const canManage = hasPermission(user, "employees.leaves.manage");

  // Fetch staff list for managers
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees({
    status: "active",
    limit: 100,
  });

  const isSearchActive = Boolean(search && search.trim() !== "");
  const isStatusActive = Boolean(status && status !== "all");
  const isStaffActive = Boolean(staffId && staffId !== "");
  const isDateActive = Boolean(startDate || endDate);

  const activeFiltersCount =
    (isSearchActive ? 1 : 0) +
    (isStatusActive ? 1 : 0) +
    (isStaffActive ? 1 : 0) +
    (isDateActive ? 1 : 0);

  return (
    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-2xs space-y-3.5">
      {/* Row 1: Search bar, Scope indicator, and Live Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input with Clear Button */}
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reason or code..."
            className="pl-9 pr-8 h-9 text-xs rounded-lg bg-background border-border/80 focus-visible:ring-1"
            aria-label="Search leave requests"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
              title="Clear search"
              aria-label="Clear search query"
            >
              ✕
            </button>
          )}
        </div>

        {/* Scope Indicator & Active Filter Count Info */}
        <div className="flex items-center gap-2 justify-end shrink-0 self-end sm:self-center">
          {activeScopeName && (
            <div
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/40 border border-border/60 px-3 py-1.5 rounded-lg h-9 shadow-2xs select-none"
              title={`Active Scope: ${activeScopeName}`}
            >
              <Building2 size={13} className="text-muted-foreground/80 shrink-0" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold hidden md:inline">
                Scope:
              </span>
              <span className="font-semibold text-foreground text-xs truncate max-w-44">
                {activeScopeName}
              </span>
              {isRefetching && (
                <RefreshCw
                  size={12}
                  className="animate-spin text-primary shrink-0 ml-1"
                  aria-label="Synchronizing"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Secondary Filter Controls with Spacious Labels & Reset Button */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/60">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            Status:
          </span>
          <div className="w-36">
            <Select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter Leaves by Status"
              className="h-9 text-xs font-medium rounded-lg bg-background border-border/80 shadow-2xs pl-2.5 pr-7 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </div>

        {/* Staff Member Filter (Managers only) */}
        {canManage && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Staff:
            </span>
            <div className="w-44">
              {isLoadingEmployees ? (
                <div className="flex items-center justify-center h-9 text-xs text-muted-foreground border border-border/80 rounded-lg bg-background px-2.5">
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Loading...
                </div>
              ) : (
                <Select
                  value={staffId}
                  onChange={(e) => onStaffIdChange(e.target.value)}
                  aria-label="Filter Leaves by Staff Member"
                  className="h-9 text-xs font-medium rounded-lg bg-background border-border/80 shadow-2xs pl-2.5 pr-7 cursor-pointer"
                >
                  <option value="">All Staff Members</option>
                  {(employeesData?.data || []).map((emp: Employee) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>
        )}

        {/* Date Range Inputs with Clean Spacing */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            Dates:
          </span>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => onStartDateChange(e.target.value)}
              aria-label="Start Date"
              title="Start Date"
              className="h-9 w-36 text-xs rounded-lg bg-background border-border/80 shadow-2xs px-2.5 cursor-pointer"
            />
            <span className="text-muted-foreground text-xs font-medium">to</span>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => onEndDateChange(e.target.value)}
              aria-label="End Date"
              title="End Date"
              className="h-9 w-36 text-xs rounded-lg bg-background border-border/80 shadow-2xs px-2.5 cursor-pointer"
            />
          </div>
        </div>

        {/* Reset Action Button */}
        {activeFiltersCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
            aria-label="Reset all active leave filters"
            className="h-9 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted transition-colors shadow-2xs shrink-0 ml-auto"
            title="Reset all active leave filters"
          >
            <RotateCcw size={13} className="shrink-0" />
            <span>Reset</span>
            <Badge
              variant="secondary"
              className="h-4.5 px-1.5 text-[10px] font-bold rounded-full ml-0.5 bg-primary/10 text-primary border-primary/20"
            >
              {activeFiltersCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Row 3: Results Summary Strip */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2.5 border-t border-border/40">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            Showing <strong className="text-foreground font-semibold">{totalResults ?? 0}</strong> leave records
          </span>
          {isStatusActive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
              Status: {status}
            </span>
          )}
          {isDateActive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-foreground border border-border">
              <Calendar size={10} className="shrink-0" />
              <span>{startDate || "Any"} → {endDate || "Any"}</span>
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
            {activeFiltersCount} active {activeFiltersCount === 1 ? "filter" : "filters"}
          </span>
        )}
      </div>
    </div>
  );
}
