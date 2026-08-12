"use client";
import React, { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Employee } from "@/features/employees/types/employee.types";
import { X, Search, Loader2 } from "lucide-react";

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
}: LeaveFiltersProps) {
  const { user } = useAuth();
  const canManage = hasPermission(user, "employees.leaves.manage");
  const [, startTransition] = useTransition();

  // Fetch employees for selection if authorized
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees({
    status: "active",
    limit: 100,
  });

  const hasAnyFilter =
    search || status !== "all" || staffId || startDate || endDate;

  return (
    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-4 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Search */}
        <div className="relative">
          <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
            Search Reason/Code
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) =>
                startTransition(() => onSearchChange(e.target.value))
              }
              className="pl-9"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
            Status
          </label>
          <Select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        {/* Staff selection (Managers only) */}
        {canManage && (
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
              Staff Member
            </label>
            {isLoadingEmployees ? (
              <div className="flex items-center h-10 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin mr-2" /> Loading...
              </div>
            ) : (
              <Select
                value={staffId}
                onChange={(e) => onStaffIdChange(e.target.value)}
              >
                <option value="">All Staff</option>
                {employeesData?.data.map((emp: Employee) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        {/* Start Date */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
            Start Date
          </label>
          <Input
            type="date"
            value={startDate}
            max={endDate || undefined}
            className="block [&::-webkit-calendar-picker-indicator]:ml-auto"
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
            End Date
          </label>
          <Input
            type="date"
            value={endDate}
            min={startDate || undefined}
            className="block [&::-webkit-calendar-picker-indicator]:ml-auto"
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
      </div>

      {hasAnyFilter && (
        <div className="flex justify-end pt-2 border-t border-border/40">
          <Button
            variant="ghost"
            onClick={onClear}
            size="sm"
            className="text-xs h-8 gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X size={14} /> Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
