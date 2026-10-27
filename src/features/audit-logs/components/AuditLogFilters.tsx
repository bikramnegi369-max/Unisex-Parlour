"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { KNOWN_ENTITY_TYPES } from "../types/auditLog.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  RotateCcw,
  Search,
  Building2,
  Calendar,
  User,
  Layers,
} from "lucide-react";

export interface AuditLogFiltersProps {
  entityType: string;
  onEntityTypeChange: (val: string) => void;
  action: string;
  onActionChange: (val: string) => void;
  actorId: string;
  onActorIdChange: (val: string) => void;
  branchId: string;
  onBranchIdChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onClear: () => void;
  totalResults?: number;
  isRefetching?: boolean;
}

export function AuditLogFilters({
  entityType,
  onEntityTypeChange,
  action,
  onActionChange,
  actorId,
  onActorIdChange,
  branchId,
  onBranchIdChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClear,
  totalResults,
}: AuditLogFiltersProps) {
  const { availableBranches } = useBranchContext();
  const { user } = useAuth();
  const isOrgWide = user?.hasOrgWideAccess === true;

  const isEntityActive = Boolean(entityType && entityType !== "all");
  const isActionActive = Boolean(action && action.trim() !== "");
  const isActorActive = Boolean(actorId && actorId.trim() !== "");
  const isBranchActive = Boolean(branchId && branchId !== "all");
  const isStartDateActive = Boolean(startDate && startDate !== "");
  const isEndDateActive = Boolean(endDate && endDate !== "");

  const activeFiltersCount =
    (isEntityActive ? 1 : 0) +
    (isActionActive ? 1 : 0) +
    (isActorActive ? 1 : 0) +
    (isBranchActive ? 1 : 0) +
    (isStartDateActive ? 1 : 0) +
    (isEndDateActive ? 1 : 0);

  return (
    <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3.5 text-left">
      {/* Tier 1: Search & Core Attribute Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        {/* Action Code Search Input (Span 4) */}
        <div className="lg:col-span-4 space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Search size={11} className="text-muted-foreground/80 shrink-0" />
            <span>Action Code</span>
          </label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Filter by action (e.g. CUSTOMER_CREATED)..."
              value={action}
              onChange={(e) => onActionChange(e.target.value)}
              className="pl-8.5 pr-7 h-9 text-xs rounded-lg bg-background border-border/90 focus-visible:ring-1"
              aria-label="Filter by action code"
            />
            {action && (
              <button
                type="button"
                onClick={() => onActionChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                title="Clear action"
                aria-label="Clear action filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Actor User ID Input (Span 3) */}
        <div className="lg:col-span-3 space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User size={11} className="text-muted-foreground/80 shrink-0" />
            <span>Actor User ID</span>
          </label>
          <div className="relative">
            <Input
              placeholder="e.g. usr_admin or user ID..."
              value={actorId}
              onChange={(e) => onActorIdChange(e.target.value)}
              className="h-9 text-xs rounded-lg bg-background border-border/90 focus-visible:ring-1 pr-7"
              aria-label="Filter by actor ID"
            />
            {actorId && (
              <button
                type="button"
                onClick={() => onActorIdChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                title="Clear actor ID"
                aria-label="Clear actor ID filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Entity Type Dropdown (Span 3) */}
        <div className="lg:col-span-3 space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers size={11} className="text-muted-foreground/80 shrink-0" />
            <span>Target Entity</span>
          </label>
          <Select
            value={entityType}
            onChange={(e) => onEntityTypeChange(e.target.value)}
            aria-label="Filter by Entity Type"
            className="h-9 text-xs font-medium rounded-lg bg-background border-border/90 shadow-2xs pl-2.5 pr-7 cursor-pointer"
          >
            <option value="all">All Entities</option>
            {KNOWN_ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>

        {/* Branch Scope Dropdown (Span 2 or hidden for single-branch staff) */}
        {isOrgWide ? (
          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2
                size={11}
                className="text-muted-foreground/80 shrink-0"
              />
              <span>Branch Scope</span>
            </label>
            <Select
              value={branchId}
              onChange={(e) => onBranchIdChange(e.target.value)}
              aria-label="Filter by Branch Scope"
              className="h-9 text-xs font-medium rounded-lg bg-background border-border/90 shadow-2xs pl-2.5 pr-7 cursor-pointer"
            >
              <option value="all">All Branches</option>
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="lg:col-span-2 hidden lg:block" />
        )}
      </div>

      {/* Tier 2: Date Range Range Controls & Integrated Reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-border/40">
        {/* Left: Date Range pickers */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Calendar size={13} className="text-muted-foreground/80 shrink-0" />
            <span className="text-[10px] uppercase tracking-wider">
              Date Range:
            </span>
          </div>

          <div className="w-full sm:w-36">
            <Input
              type="date"
              value={startDate}
              max={endDate || undefined}
              className="h-8.5 text-xs rounded-lg bg-background border-border/90 shadow-2xs [&::-webkit-calendar-picker-indicator]:ml-auto"
              onChange={(e) => onStartDateChange(e.target.value)}
              aria-label="Start Date"
            />
          </div>

          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            to
          </span>

          <div className="w-full sm:w-36">
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              className="h-8.5 text-xs rounded-lg bg-background border-border/90 shadow-2xs [&::-webkit-calendar-picker-indicator]:ml-auto"
              onChange={(e) => onEndDateChange(e.target.value)}
              aria-label="End Date"
            />
          </div>
        </div>

        {/* Right: Reset Action Button */}
        {activeFiltersCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
            aria-label="Reset all active audit log filters"
            className="h-8.5 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted transition-colors shadow-2xs shrink-0 self-start sm:self-auto"
            title="Reset all filters"
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

      {/* Sub-bar: Clean Results summary with active badges and zero layout shift */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            Showing{" "}
            <strong className="text-foreground font-semibold">
              {totalResults ?? 0}
            </strong>{" "}
            audit events
          </span>
          {isEntityActive && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
              Entity: {entityType}
            </span>
          )}
          {isActionActive && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-secondary/80 text-secondary-foreground border border-border/60">
              Action: {action}
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <span className="text-[10px] text-muted-foreground font-medium shrink-0">
            {activeFiltersCount} active{" "}
            {activeFiltersCount === 1 ? "filter" : "filters"}
          </span>
        )}
      </div>
    </div>
  );
}
