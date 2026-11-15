"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Coupon } from "../types/coupon.types";

interface CouponDeleteDialogProps {
  coupon: Coupon | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CouponDeleteDialog: React.FC<CouponDeleteDialogProps> = ({
  coupon,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!coupon) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Delete Coupon Campaign" maxWidth="md">
      <div className="space-y-4 text-left">
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3 text-destructive">
          <AlertTriangle className="shrink-0 h-5 w-5 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Campaign Archival & Deletion</p>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">
              Deleting this coupon will soft-delete the record and remove it from active coupon management.
              The coupon code (<span className="font-mono font-semibold">{coupon.code}</span>) remains permanently reserved in your organization.
            </p>
          </div>
        </div>

        <div className="text-sm text-foreground space-y-2">
          <p>
            Are you sure you want to delete coupon{" "}
            <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {coupon.code}
            </span>
            ?
          </p>
          <p className="text-xs text-muted-foreground">
            Current recorded usage:{" "}
            <span className="font-semibold text-foreground">{coupon.usageCount ?? 0}</span>
            {coupon.totalUsageLimit !== null && coupon.totalUsageLimit !== undefined
              ? ` / ${coupon.totalUsageLimit} total limit`
              : ""}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Delete
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
