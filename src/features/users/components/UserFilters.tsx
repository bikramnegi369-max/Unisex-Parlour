"use client";

import React from "react";
import { RefreshCw, X } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface UserFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  onClearFilters: () => void;
  activeScopeName: string;
  isRefetching: boolean;
}

export function UserFilters({
  status,
  onStatusChange,
  sort,
  onSortChange,
  onClearFilters,
  activeScopeName,
  isRefetching,
}: UserFiltersProps) {
  const hasActiveFilters = status !== "all" || sort !== "";

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
            <option value="suspended">Suspended Only</option>
            <option value="locked">Locked Only</option>
          </Select>
        </div>

        {/* Sort Selection */}
        <div className="min-w-40">
          <Select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort Users"
          >
            <option value="">Sort by (Default)</option>
            <option value="name">Name (A-Z)</option>
            <option value="-name">Name (Z-A)</option>
            <option value="createdAt">Date (Oldest)</option>
            <option value="-createdAt">Date (Newest)</option>
            <option value="updatedAt">Updated (Oldest)</option>
            <option value="-updatedAt">Updated (Newest)</option>
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
          <span className="font-semibold text-foreground">
            {activeScopeName}
          </span>
          {isRefetching && (
            <RefreshCw size={12} className="animate-spin text-primary ml-1" />
          )}
        </div>
      </div>
    </div>
  );
}
