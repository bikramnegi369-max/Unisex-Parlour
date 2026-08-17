"use client";

import React from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import PermissionGate from "@/components/layout/PermissionGate";

interface RolesListHeaderProps {
  onCreateRoleClick: () => void;
}

export default function RolesListHeader({ onCreateRoleClick }: RolesListHeaderProps) {
  const actions = (
    <PermissionGate permission="roles.create">
      <Button
        onClick={onCreateRoleClick}
        className="flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer h-8 w-full sm:w-auto"
      >
        <Plus size={16} />
        Create Custom Role
      </Button>
    </PermissionGate>
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

