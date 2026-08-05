import React from "react";
import { Plus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";

interface EmployeeListHeaderProps {
  canCreate: boolean;
  onAddClick: () => void;
  isSyncing: boolean;
  onSync: () => void;
}

export function EmployeeListHeader({
  canCreate,
  onAddClick,
  isSyncing,
  onSync,
}: EmployeeListHeaderProps) {
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
          Add Employee
        </Button>
      )}
    </>
  );

  return (
    <PageHeaderBanner
      title="Employees & Staff Directory"
      description="Manage employee profiles, roles, and branch assignments."
      icon={UserCheck}
      actions={actions}
    />
  );
}
