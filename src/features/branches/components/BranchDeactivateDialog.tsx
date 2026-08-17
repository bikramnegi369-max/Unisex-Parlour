"use client";

import React from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
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
    <Dialog isOpen={isOpen} onClose={onClose} title="Deactivate Branch">
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-sm">Are you sure?</p>
            <p>
              This will deactivate <strong className="font-semibold">{branch.name}</strong>. The branch will be soft-deactivated and hidden from active operations.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Note: An organization must always retain at least one active branch. Deactivating the final remaining active branch will be rejected by the system.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeactivate}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deactivating..." : "Deactivate Branch"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
