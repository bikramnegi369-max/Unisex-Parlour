"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { KNOWN_ENTITY_TYPES } from "../types/auditLog.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { X, Search } from "lucide-react";

interface AuditLogFiltersProps {
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
}: AuditLogFiltersProps) {
  const { availableBranches } = useBranchContext();
  const { user } = useAuth();
  const isOrgWide = user?.hasOrgWideAccess === true;

  const hasAnyFilter = Boolean(
    (entityType && entityType !== "all") ||
      action ||
      actorId ||
      (branchId && branchId !== "all") ||
      startDate ||
      endDate
  );

  return (
    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-4 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Entity Type */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
            Entity Type
          </label>
          <Select
            value={entityType}
            onChange={(e) => onEntityTypeChange(e.target.value)}
          >
            <option value="all">All Entities</option>
            {KNOWN_ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>

        {/* Action Filter */}
        <div className="relative">
          <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
            Action Code
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="e.g. CUSTOMER_CREATED"
              value={action}
              onChange={(e) => onActionChange(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Actor ID Filter */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
            Actor User ID
          </label>
          <Input
            placeholder="User ID..."
            value={actorId}
            onChange={(e) => onActorIdChange(e.target.value)}
            className="text-xs"
          />
        </div>

        {/* Branch Filter (Org-wide users only) */}
        {isOrgWide ? (
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
              Branch Scope
            </label>
            <Select
              value={branchId}
              onChange={(e) => onBranchIdChange(e.target.value)}
            >
              <option value="all">All Branches</option>
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {/* Start Date */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
            Start Date
          </label>
          <Input
            type="date"
            value={startDate}
            max={endDate || undefined}
            className="block text-xs [&::-webkit-calendar-picker-indicator]:ml-auto"
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
            className="block text-xs [&::-webkit-calendar-picker-indicator]:ml-auto"
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
