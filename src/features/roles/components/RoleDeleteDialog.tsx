"use client";

import React from "react";
import DeactivateDialog from "@/components/entity/DeactivateDialog";
import { useDeleteRole } from "../hooks/useRoles";

interface RoleDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string | null;
  roleName: string;
  onSuccess?: () => void;
}

export default function RoleDeleteDialog({
  isOpen,
  onClose,
  roleId,
  roleName,
  onSuccess,
}: RoleDeleteDialogProps) {
  const { mutate: deleteRole, isPending } = useDeleteRole();

  const handleConfirm = () => {
    if (!roleId) return;
    deleteRole(roleId, {
      onSuccess: () => {
        onClose();
        if (onSuccess) onSuccess();
      },
    });
  };

  return (
    <DeactivateDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      isDeleting={isPending}
      itemName={roleName}
      title="Delete Custom Role"
      noticeTitle="RBAC Deletion Warning"
      noticeDescription="Deleting this custom role will permanently remove its permission definitions. Any active staff or user profiles assigned to this role should be reassigned before deletion."
    />
  );
}
