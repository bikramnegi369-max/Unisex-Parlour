"use client";

import React from "react";
import { Search, X, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { CouponStatus } from "../types/coupon.types";

interface CouponFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: CouponStatus | "all";
  onStatusChange: (status: CouponStatus | "all") => void;
  onReset: () => void;
  isFiltered: boolean;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function CouponFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  onReset,
  isFiltered,
  onRefresh,
  isLoading = false,
}: CouponFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3.5 rounded-xl border border-border/60 shadow-xs">
      <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search coupon code or description..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-sm h-9"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="w-full sm:w-44">
          <Select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as CouponStatus | "all")}
            className="h-9 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Campaigns</option>
            <option value="inactive">Inactive Campaigns</option>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 px-3 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
