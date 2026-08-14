import React from "react";
import { ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";

interface UserListHeaderProps {
  canCreate: boolean;
  onAddClick: () => void;
  isSyncing: boolean;
  onSync: () => void;
}

export function UserListHeader({
  canCreate,
  onAddClick,
  isSyncing,
  onSync,
}: UserListHeaderProps) {
  const actions = (
    <>
      <SyncButton
        isSyncing={isSyncing}
        onSync={onSync}
        label="Refresh Users"
        className="w-full sm:w-auto"
      />
      {canCreate && (
        <Button
          onClick={onAddClick}
          className="flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer h-8 w-full sm:w-auto"
        >
          <Plus size={16} />
          Add User
        </Button>
      )}
    </>
  );

  return (
    <PageHeaderBanner
      title="User Directory"
      description="Manage system users, credentials, roles, branch authorization, and account status."
      icon={ShieldCheck}
      actions={actions}
    />
  );
}
