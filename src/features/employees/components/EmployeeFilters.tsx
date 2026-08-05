"use client";

import React from "react";
import { RefreshCw, X } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface EmployeeFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  role: string;
  onRoleChange: (role: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  onClearFilters: () => void;
  activeScopeName: string;
  isRefetching: boolean;
}

export function EmployeeFilters({
  status,
  onStatusChange,
  role,
  onRoleChange,
  sort,
  onSortChange,
  onClearFilters,
  activeScopeName,
  isRefetching,
}: EmployeeFiltersProps) {
  const hasActiveFilters = status !== "all" || role !== "all" || sort !== "";

  return (
    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center w-full lg:w-auto">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Status Filter */}
        <div className="min-w-35">
          <Select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by Status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </Select>
        </div>

        {/* Role Filter */}
        <div className="min-w-35">
          <Select
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            aria-label="Filter by Role"
          >
            <option value="all">All Roles</option>
            <option value="Owner">Owner</option>
            <option value="Manager">Manager</option>
            <option value="Receptionist">Receptionist</option>
            <option value="Stylist">Stylist</option>
            <option value="Accountant">Accountant</option>
          </Select>
        </div>

        {/* Sort Selection */}
        <div className="min-w-40">
          <Select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort Employees"
          >
            <option value="">Sort by (Default)</option>
            <option value="firstName">First Name (A-Z)</option>
            <option value="-firstName">First Name (Z-A)</option>
            <option value="lastName">Last Name (A-Z)</option>
            <option value="-lastName">Last Name (Z-A)</option>
            <option value="createdAt">Date Joined (Oldest)</option>
            <option value="-createdAt">Date Joined (Newest)</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-between sm:justify-start">
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={onClearFilters}
            className="h-9 px-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
            Reset
          </Button>
        )}

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0 bg-muted/30 border border-border/50 px-3 py-2.5 rounded-lg ml-auto sm:ml-0">
          <span>Active Scope:</span>
          <span className="font-semibold text-foreground">{activeScopeName}</span>
          {isRefetching && <RefreshCw size={12} className="animate-spin text-primary ml-1" />}
        </div>
      </div>
    </div>
  );
}
