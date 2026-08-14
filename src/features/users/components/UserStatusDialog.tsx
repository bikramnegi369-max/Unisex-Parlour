import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { UserResponseDTO, UpdateUserStatus } from "../types/users.types";

interface UserStatusDialogProps {
  user: UserResponseDTO | null;
  targetStatus: UpdateUserStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function UserStatusDialog({
  user,
  targetStatus,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: UserStatusDialogProps) {
  if (!user || !targetStatus) return null;

  const getImpactMessage = () => {
    if (targetStatus === "inactive") {
      return "Deactivating this user account will revoke all operational portal access. Any active session for this user will be invalidated immediately.";
    }
    if (targetStatus === "suspended") {
      return "Suspending this user account is a security action. The user will be locked out of the ERP system, and all current active sessions will be forcefully terminated.";
    }
    // Re-activating active status (including from locked)
    return "Re-activating this user will restore their authorization permissions and allow them to log back in. If they were locked out, this action will unlock their account.";
  };

  const getTitle = () => {
    if (targetStatus === "inactive") return "Deactivate User Account?";
    if (targetStatus === "suspended") return "Suspend User Account?";
    return "Re-activate User Account?";
  };

  const getConfirmButtonLabel = () => {
    if (targetStatus === "inactive") return "Deactivate Account";
    if (targetStatus === "suspended") return "Suspend Account";
    return "Activate Account";
  };

  const getConfirmButtonVariant = () => {
    if (targetStatus === "inactive") return "outline";
    if (targetStatus === "suspended") return "default";
    return "default";
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <div className="space-y-4 text-left">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {getImpactMessage()}
        </p>
        <p className="text-xs font-semibold text-foreground bg-muted/30 p-2.5 rounded border border-border">
          Target User: <strong className="text-primary">{user.name}</strong> ({user.email})
        </p>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`cursor-pointer ${
              targetStatus === "suspended"
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/10"
                : "bg-primary hover:bg-primary/95 text-primary-foreground"
            }`}
          >
            {isSubmitting ? "Updating..." : getConfirmButtonLabel()}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
