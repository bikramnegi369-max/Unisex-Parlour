"use client";

import React from "react";
import {
  RotateCcw,
  Search,
  Building2,
  RefreshCw,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  onClearFilters: () => void;
  activeScopeName?: string;
  isRefetching?: boolean;
  totalResults?: number;
}

export function UserFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  onClearFilters,
  activeScopeName = "Organization-Wide",
  isRefetching,
  totalResults,
}: UserFiltersProps) {
  const isSearchActive = Boolean(search && search.trim() !== "");
  const isStatusActive = Boolean(status && status !== "all");
  const isSortActive = Boolean(sort && sort !== "");

  const activeFiltersCount =
    (isSearchActive ? 1 : 0) + (isStatusActive ? 1 : 0) + (isSortActive ? 1 : 0);

  return (
    <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-3">
      {/* Primary Unified Controls Row */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-full lg:max-w-md">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search users by name, username, email, or phone..."
            className="pl-9 pr-8 h-9 text-xs rounded-lg bg-background border-border/90 focus-visible:ring-1"
            aria-label="Search users"
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

        {/* Right: Dropdown Controls + Actions */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="w-full sm:w-36">
            <Select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter Users by Status"
              className="h-9 text-xs font-medium rounded-lg bg-background border-border/90 shadow-2xs pl-2.5 pr-7 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="locked">Locked Only</option>
            </Select>
          </div>

          {/* Sort Selection */}
          <div className="w-full sm:w-48">
            <Select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort Users"
              className="h-9 text-xs font-medium rounded-lg bg-background border-border/90 shadow-2xs pl-2.5 pr-7 cursor-pointer"
            >
              <option value="">Sort: Default</option>
              <option value="name">Name (A → Z)</option>
              <option value="-name">Name (Z → A)</option>
              <option value="-createdAt">Created (Newest)</option>
              <option value="createdAt">Created (Oldest)</option>
              <option value="-updatedAt">Updated (Newest)</option>
              <option value="updatedAt">Updated (Oldest)</option>
            </Select>
          </div>

          {/* Reset Action Button */}
          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              aria-label="Reset all active user filters"
              className="h-9 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted transition-colors shadow-2xs shrink-0"
              title="Reset search and filters"
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

          {/* Scope Indicator */}
          <div
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/30 border border-border/50 px-2.5 py-1.5 rounded-lg h-9 shadow-2xs shrink-0 select-none ml-auto sm:ml-0"
            title={`Active Scope: ${activeScopeName}`}
          >
            <Building2 size={13} className="text-muted-foreground/80 shrink-0" />
            <span className="font-semibold text-foreground text-xs truncate max-w-36 lg:max-w-48">
              {activeScopeName}
            </span>
            {isRefetching && (
              <RefreshCw
                size={12}
                className="animate-spin text-primary shrink-0 ml-0.5"
                aria-label="Synchronizing"
              />
            )}
          </div>
        </div>
      </div>

      {/* Sub-bar: Clean Results summary with active badge status */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-foreground font-semibold">{totalResults ?? 0}</strong> user accounts
          </span>
          {isStatusActive && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 capitalize">
              Status: {status}
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <span className="text-[10px] text-muted-foreground font-medium">
            {activeFiltersCount} active {activeFiltersCount === 1 ? "filter" : "filters"}
          </span>
        )}
      </div>
    </div>
  );
}
