"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Select } from "@/components/ui/select";

interface CustomerFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  activeScopeName: string;
  isRefetching: boolean;
}

export function CustomerFilters({
  status,
  onStatusChange,
  sort,
  onSortChange,
  activeScopeName,
  isRefetching,
}: CustomerFiltersProps) {
  return (
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
            <option value="blocked">Blocked Only</option>
          </Select>
      </div>

      {/* Sort Selection */}
      <div className="min-w-40">
        <Select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort Customers"
        >
          <option value="">Sort by (Default)</option>
          <option value="name">Name (A-Z)</option>
          <option value="-name">Name (Z-A)</option>
          <option value="createdAt">Date (Oldest)</option>
          <option value="-createdAt">Date (Newest)</option>
          <option value="updatedAt">Updated (Oldest)</option>
          <option value="-updatedAt">Updated (Newest)</option>
          <option value="loyaltyPoints">Loyalty (Lowest)</option>
          <option value="-loyaltyPoints">Loyalty (Highest)</option>
        </Select>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0 bg-muted/30 border border-border/50 px-3 py-2.5 rounded-lg">
        <span>Active Scope:</span>
        <span className="font-semibold text-foreground">{activeScopeName}</span>
        {isRefetching && <RefreshCw size={12} className="animate-spin text-primary ml-1" />}
      </div>
    </div>
  );
}
