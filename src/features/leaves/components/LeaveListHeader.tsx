"use client";

import React from "react";
import { Plus, CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";

interface LeaveListHeaderProps {
  canCreate: boolean;
  onAddClick: () => void;
  isSyncing: boolean;
  onSync: () => void;
}

export function LeaveListHeader({
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
      {canCreate && (
        <Button
          onClick={onAddClick}
          className="flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer h-8 w-full sm:w-auto"
        >
          <Plus size={16} />
          Apply for Leave
        </Button>
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
