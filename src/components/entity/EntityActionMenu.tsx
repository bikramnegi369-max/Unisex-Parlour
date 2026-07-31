"use client";

import React from "react";
import { Eye, Edit, Trash2, UserCheck } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission, type PermissionType } from "@/lib/permissions";

interface EntityActionMenuProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReactivate?: () => void;
  status?: "active" | "inactive" | string;
  permissions?: {
    edit?: string;
    delete?: string;
  };
}

export function EntityActionMenu({
  onView,
  onEdit,
  onDelete,
  onReactivate,
  status = "active",
  permissions,
}: EntityActionMenuProps) {
  const { user } = useAuth();
  
  const editPerm = permissions?.edit as PermissionType | undefined;
  const deletePerm = permissions?.delete as PermissionType | undefined;

  const canEdit = !editPerm || hasPermission(user, editPerm);
  const canDelete = !deletePerm || hasPermission(user, deletePerm);
  const isActive = status === "active";

  return (
    <div className="flex justify-end gap-2">
      {onView && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="cursor-pointer h-9 w-9 rounded-lg hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors text-muted-foreground"
          title="View Details"
        >
          <Eye size={15} />
        </button>
      )}
      {onEdit && canEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="cursor-pointer h-9 w-9 rounded-lg hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors text-muted-foreground"
          title="Edit Profile"
        >
          <Edit size={15} />
        </button>
      )}
      {isActive && onDelete && canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="cursor-pointer hover:bg-destructive/10 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-destructive"
          title="Deactivate"
        >
          <Trash2 size={15} />
        </button>
      )}
      {!isActive && onReactivate && canEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReactivate();
          }}
          className="cursor-pointer hover:bg-emerald-500/10 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-emerald-600 dark:text-emerald-500"
          title="Reactivate"
        >
          <UserCheck size={15} />
        </button>
      )}
    </div>
  );
}
