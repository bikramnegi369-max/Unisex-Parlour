"use client";

import React from "react";
import { toast } from "sonner";
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
        toast.success("Role deleted successfully.");
        onClose();
        if (onSuccess) onSuccess();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to delete role.";
        toast.error(msg);
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
