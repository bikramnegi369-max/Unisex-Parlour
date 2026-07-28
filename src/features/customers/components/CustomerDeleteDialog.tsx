"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface CustomerDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  customerName: string;
}

export default function CustomerDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  customerName,
}: CustomerDeleteDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Deactivate Customer Profile">
      <div className="space-y-4 text-left">
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3 text-destructive">
          <Trash2 className="shrink-0 h-5 w-5 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Important Notice</p>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">
              Deactivating this customer will remove them from active directories and future bookings. 
              <strong> Historical transaction records (such as appointments, invoices, and memberships) will remain fully intact</strong> in accordance with auditing regulations.
            </p>
          </div>
        </div>

        <p className="text-sm text-foreground">
          Are you sure you want to deactivate the profile of <strong>{customerName}</strong>?
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              "Deactivate"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
