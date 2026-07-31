import React from "react";
import ReactivateDialog from "@/components/entity/ReactivateDialog";

interface CustomerReactivateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  error: Error | null;
  customerName: string;
}

export default function CustomerReactivateDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  error,
  customerName,
}: CustomerReactivateDialogProps) {
  return (
    <ReactivateDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      error={error}
      itemName={customerName}
      title="Reactivate Customer Profile"
      noticeTitle="Status Restoration"
      noticeDescription="Reactivating this customer will restore their active status and make them available for future bookings, appointments, and other normal operations."
    />
  );
}
