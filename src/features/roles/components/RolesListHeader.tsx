"use client";

import React from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";
import PermissionGate from "@/components/layout/PermissionGate";

interface RolesListHeaderProps {
  onCreateRoleClick: () => void;
  isSyncing?: boolean;
  onSync?: () => void;
}

export default function RolesListHeader({
  onCreateRoleClick,
  isSyncing = false,
  onSync,
}: RolesListHeaderProps) {
  const actions = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
      {onSync && (
        <SyncButton
          isSyncing={isSyncing}
          onSync={onSync}
          label="Refresh Roles"
          className="w-full sm:w-auto"
        />
      )}
      <PermissionGate permission="roles.create">
        <Button
          onClick={onCreateRoleClick}
          className="flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer h-8 w-full sm:w-auto"
        >
          <Plus size={16} />
          Create Custom Role
        </Button>
      </PermissionGate>
    </div>
  );

  return (
    <PageHeaderBanner
      title="Roles & Permissions"
      description="Configure security authorization bounds and action capabilities for organization staff roles."
      icon={ShieldCheck}
      actions={actions}
    />
  );
}

