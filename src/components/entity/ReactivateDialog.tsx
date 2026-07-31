"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, UserCheck } from "lucide-react";
import { getErrorMessage } from "@/lib/api/errors";

interface ReactivateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  error: Error | null;
  itemName: string;
  title: string;
  noticeTitle?: string;
  noticeDescription?: string;
}

export default function ReactivateDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  error,
  itemName,
  title,
  noticeTitle = "Status Restoration",
  noticeDescription = "Reactivating this profile will restore active status and make it available for future operations and normal selection.",
}: ReactivateDialogProps) {
  const errorMessage = error ? getErrorMessage(error) : null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 text-left">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex gap-3 text-emerald-600 dark:text-emerald-500">
          <UserCheck className="shrink-0 h-5 w-5 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">{noticeTitle}</p>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">
              {noticeDescription}
            </p>
          </div>
        </div>

        <p className="text-sm text-foreground">
          Are you sure you want to reactivate <strong>{itemName}</strong>?
        </p>

        {errorMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reactivating...
              </>
            ) : (
              "Reactivate"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
