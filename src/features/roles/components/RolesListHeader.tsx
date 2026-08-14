"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PermissionGate from "@/components/layout/PermissionGate";

interface RolesListHeaderProps {
  onCreateRoleClick: () => void;
}

export default function RolesListHeader({ onCreateRoleClick }: RolesListHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure security authorization bounds and action capabilities for organization staff roles.
        </p>
      </div>

      <PermissionGate permission="roles.create">
        <Button
          onClick={onCreateRoleClick}
          className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10 rounded-xl font-semibold cursor-pointer shrink-0"
        >
          <Plus size={18} />
          Create Custom Role
        </Button>
      </PermissionGate>
    </div>
  );
}
