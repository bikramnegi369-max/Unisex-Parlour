"use client";

import React from "react";
import { toast } from "sonner";
import DeactivateDialog from "@/components/entity/DeactivateDialog";
import { getErrorMessage } from "@/lib/api/errors";
import { useDeleteBranch } from "../hooks/useDeleteBranch";
import type { Branch } from "@/types/branch";

interface BranchDeactivateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
}

export function BranchDeactivateDialog({
  isOpen,
  onClose,
  branch,
}: BranchDeactivateDialogProps) {
  const deleteMutation = useDeleteBranch();

  if (!branch) return null;

  const handleDeactivate = async () => {
    try {
      await deleteMutation.mutateAsync(branch.id);
      toast.success("Branch deactivated successfully");
      onClose();
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to deactivate branch.");
      toast.error(message);
    }
  };

  return (
    <DeactivateDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDeactivate}
      isDeleting={deleteMutation.isPending}
      itemName={branch.name}
      title="Deactivate Branch"
      noticeTitle="Branch Deactivation Notice"
      noticeDescription="Deactivating this branch will soft-deactivate it and hide it from active operations. Note: An organization must always retain at least one active branch; deactivating the final active branch will be rejected by the system."
    />
  );
}

