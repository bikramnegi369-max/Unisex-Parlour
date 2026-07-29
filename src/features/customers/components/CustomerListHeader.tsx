"use client";

import React from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomerListHeaderProps {
  isAllBranchesSelected: boolean;
  canCreate: boolean;
  onAddClick: () => void;
}

export function CustomerListHeader({
  isAllBranchesSelected,
  canCreate,
  onAddClick,
}: CustomerListHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Directory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage profiles, registrations, and visibility scopes across branches.
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        {isAllBranchesSelected ? (
          <div className="text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            <span>Select branch to register customer</span>
          </div>
        ) : (
          canCreate && (
            <Button
              onClick={onAddClick}
              className="flex items-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer"
            >
              <Plus size={16} />
              Add Customer
            </Button>
          )
        )}
      </div>
    </div>
  );
}
