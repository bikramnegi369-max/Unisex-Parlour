"use client";

import React from "react";
import {
  RotateCcw,
  X,
  SlidersHorizontal,
  Building2,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CustomerFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
  onClearFilters: () => void;
  activeScopeName: string;
  isRefetching: boolean;
  totalResults?: number;
}

export function CustomerFilters({
  status,
  onStatusChange,
  sort,
  onSortChange,
  searchQuery,
  onClearSearch,
  onClearFilters,
  activeScopeName,
  isRefetching,
  totalResults,
}: CustomerFiltersProps) {
  // Active filter count calculation (status, sort, and optional search pill)
  const isStatusActive = Boolean(status && status !== "all");
  const isSortActive = Boolean(sort && sort !== "");
  const isSearchActive = Boolean(searchQuery && searchQuery.trim() !== "");

  const activeFiltersCount =
    (isStatusActive ? 1 : 0) + (isSortActive ? 1 : 0);

  const getSortLabel = (sortValue: string): string => {
    switch (sortValue) {
      case "name":
        return "Name (A → Z)";
      case "-name":
        return "Name (Z → A)";
      case "createdAt":
        return "Registration (Oldest)";
      case "-createdAt":
        return "Registration (Newest)";
      case "updatedAt":
        return "Updated (Oldest)";
      case "-updatedAt":
        return "Updated (Newest)";
      case "loyaltyPoints":
        return "Loyalty (Lowest)";
      case "-loyaltyPoints":
        return "Loyalty (Highest)";
      default:
        return "Default";
    }
  };

  const getStatusLabel = (statusValue: string): string => {
    switch (statusValue) {
      case "active":
        return "Active Only";
      case "inactive":
        return "Inactive Only";
      case "blocked":
        return "Blocked Only";
      default:
        return statusValue;
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Primary Toolbar Control Row */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between w-full">
        {/* Dropdown Filters Group */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-1">
          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter Customers by Status"
              className="h-9 text-xs font-medium rounded-lg bg-card border-border shadow-2xs pl-3 pr-8 transition-colors focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="blocked">Blocked Only</option>
            </Select>
          </div>

          {/* Sort Selection */}
          <div className="w-full sm:w-52">
            <Select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort Customers"
              className="h-9 text-xs font-medium rounded-lg bg-card border-border shadow-2xs pl-3 pr-8 transition-colors focus:border-primary"
            >
              <option value="">Sort: Default</option>
              <option value="name">Name (A → Z)</option>
              <option value="-name">Name (Z → A)</option>
              <option value="-createdAt">Registration (Newest)</option>
              <option value="createdAt">Registration (Oldest)</option>
              <option value="-updatedAt">Updated (Newest)</option>
              <option value="updatedAt">Updated (Oldest)</option>
              <option value="-loyaltyPoints">Loyalty (Highest)</option>
              <option value="loyaltyPoints">Loyalty (Lowest)</option>
            </Select>
          </div>

          {/* Reset Action Button with Badge */}
          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              aria-label="Reset all active filters"
              className="h-9 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/60 transition-colors shadow-2xs shrink-0"
              title="Reset all active customer filters"
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

        {/* Scope and Sync Indicator */}
        <div className="flex items-center gap-2 justify-end shrink-0 self-end sm:self-center">
          <div
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/40 border border-border/60 px-3 py-1.5 rounded-lg h-9 shadow-2xs select-none"
            title={`Active Scope: ${activeScopeName}`}
          >
            <Building2 size={13} className="text-muted-foreground/80 shrink-0" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold hidden md:inline">
              Scope:
            </span>
            <span className="font-semibold text-foreground text-xs truncate max-w-44 lg:max-w-64">
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
        </div>
      </div>

      {/* Active Filter Chips / Pills Row */}
      {(activeFiltersCount > 0 || isSearchActive) && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 animate-in fade-in duration-200">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mr-1">
            <SlidersHorizontal size={11} className="text-primary" />
            <span>Active filters:</span>
          </span>

          {/* Search Chip */}
          {isSearchActive && onClearSearch && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 shadow-2xs">
              <Search size={10} className="shrink-0" />
              <span className="truncate max-w-40">Query: &quot;{searchQuery}&quot;</span>
              <button
                type="button"
                onClick={onClearSearch}
                className="hover:bg-primary/20 rounded p-0.5 cursor-pointer ml-0.5 text-primary/80 hover:text-primary transition-colors"
                title="Clear search query"
                aria-label="Clear search query"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {/* Status Chip */}
          {isStatusActive && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium border shadow-2xs ${
                status === "active"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : status === "blocked"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
              }`}
            >
              <Sparkles size={10} className="shrink-0" />
              <span>Status: {getStatusLabel(status)}</span>
              <button
                type="button"
                onClick={() => onStatusChange("all")}
                className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5 cursor-pointer ml-0.5 transition-colors"
                title="Remove status filter"
                aria-label="Remove status filter"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {/* Sort Chip */}
          {isSortActive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border/80 shadow-2xs">
              <ArrowUpDown size={10} className="shrink-0 text-muted-foreground" />
              <span>Sort: {getSortLabel(sort)}</span>
              <button
                type="button"
                onClick={() => onSortChange("")}
                className="hover:bg-muted-foreground/20 rounded p-0.5 cursor-pointer ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                title="Reset sorting to default"
                aria-label="Reset sorting to default"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {/* Total Results Summary */}
          {totalResults !== undefined && (
            <span className="text-[11px] text-muted-foreground ml-auto font-medium">
              {totalResults} {totalResults === 1 ? "customer profile" : "customer profiles"} found
            </span>
          )}
        </div>
      )}
    </div>
  );
}
