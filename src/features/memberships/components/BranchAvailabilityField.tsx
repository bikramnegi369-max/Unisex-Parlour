"use client";

import React, { useState, useMemo } from "react";
import { Building2, Check, X, Search, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useBranches } from "@/features/branches/hooks/useBranches";

interface BranchAvailabilityFieldProps {
  value: string[];
  onChange: (permittedBranchIds: string[]) => void;
  disabled?: boolean;
}

export function BranchAvailabilityField({
  value = [],
  onChange,
  disabled = false,
}: BranchAvailabilityFieldProps) {
  const { branches: allBranches = [], isLoading } = useBranches();
  const [searchQuery, setSearchQuery] = useState("");

  const isAllBranches = value.length === 0;

  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return allBranches;
    const q = searchQuery.toLowerCase();
    return allBranches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.address && b.address.toLowerCase().includes(q)),
    );
  }, [allBranches, searchQuery]);

  const handleToggleAll = () => {
    if (disabled) return;
    if (isAllBranches) {
      // Switch from "All" to all individual IDs selected initially
      onChange(allBranches.map((b) => b.id));
    } else {
      // Empty array signifies valid across ALL branches
      onChange([]);
    }
  };

  const handleToggleBranch = (branchId: string) => {
    if (disabled) return;
    if (isAllBranches) {
      // Deselecting one means all OTHER branches are permitted
      onChange(allBranches.map((b) => b.id).filter((id) => id !== branchId));
    } else if (value.includes(branchId)) {
      const next = value.filter((id) => id !== branchId);
      onChange(next);
    } else {
      const next = [...value, branchId];
      if (next.length === allBranches.length) {
        // If all are selected, clean normalize back to [] (all branches)
        onChange([]);
      } else {
        onChange(next);
      }
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const handleClearAll = () => {
    if (disabled) return;
    // Set to empty or keep first if required
    onChange([]);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-primary" /> Permitted Salon Branches
        </label>
        <span className="text-[11px] text-muted-foreground font-medium">
          {isAllBranches
            ? "Valid at All Branches"
            : `${value.length} of ${allBranches.length} branch${value.length === 1 ? "" : "es"} restricted`}
        </span>
      </div>

      {/* Mode Toggle Banner */}
      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 text-xs">
        <div className="flex items-center gap-2">
          <Globe2 className={`w-4 h-4 ${isAllBranches ? "text-emerald-600" : "text-muted-foreground"}`} />
          <div>
            <span className="font-semibold block">
              {isAllBranches ? "Universal Branch Access Active" : "Branch-Restricted Mode"}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              {isAllBranches
                ? "This membership can be redeemed at all current and future salon branches."
                : "This membership can only be redeemed at the specific branches selected below."}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleAll}
          className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
            isAllBranches
              ? "bg-background hover:bg-muted text-foreground border-border"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isAllBranches ? "Restrict to Specific Branches" : "Allow All Branches"}
        </button>
      </div>

      {/* Specific Branch Selector List (Visible when restricted mode or searching) */}
      {!isAllBranches && (
        <div className="space-y-2 border rounded-lg p-2.5 bg-card">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-7.5"
                disabled={disabled}
              />
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={handleSelectAll}
              className="text-[10px] text-primary hover:underline font-medium shrink-0"
            >
              Select All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pt-1">
            {isLoading ? (
              <div className="col-span-2 text-center py-3 text-xs text-muted-foreground">
                Loading branches...
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="col-span-2 text-center py-3 text-xs text-muted-foreground italic">
                No matching branches found.
              </div>
            ) : (
              filteredBranches.map((branch) => {
                const isSelected = value.includes(branch.id);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleToggleBranch(branch.id)}
                    className={`flex items-center justify-between p-2 rounded border text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-primary font-medium text-foreground"
                        : "bg-muted/20 border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="block truncate font-medium">{branch.name}</span>
                      {branch.address && (
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {branch.address}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
