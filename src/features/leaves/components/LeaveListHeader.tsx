"use client";

import React from "react";
import { Plus, CalendarOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";

interface LeaveListHeaderProps {
  isAllBranchesSelected: boolean;
  canCreate: boolean;
  onAddClick: () => void;
  isSyncing: boolean;
  onSync: () => void;
}

export function LeaveListHeader({
  isAllBranchesSelected,
  canCreate,
  onAddClick,
  isSyncing,
  onSync,
}: LeaveListHeaderProps) {
  const actions = (
    <>
      <SyncButton
        isSyncing={isSyncing}
        onSync={onSync}
        label="Refresh List"
        className="w-full sm:w-auto"
      />
      {isAllBranchesSelected ? (
        <div className="text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1.5 h-8 w-full sm:w-auto">
          <AlertTriangle size={14} />
          <span>Select branch to apply for leave</span>
        </div>
      ) : (
        canCreate && (
          <Button
            onClick={onAddClick}
            className="flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer h-8 w-full sm:w-auto"
          >
            <Plus size={16} />
            Apply for Leave
          </Button>
        )
      )}
    </>
  );

  return (
    <PageHeaderBanner
      title="Staff Leaves"
      description="Manage employee leave requests, approvals, and cancellations."
      icon={CalendarOff}
      actions={actions}
    />
  );
}
