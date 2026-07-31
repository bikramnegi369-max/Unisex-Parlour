import React from "react";
import DeactivateDialog from "@/components/entity/DeactivateDialog";

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
    <DeactivateDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
      itemName={customerName}
      title="Deactivate Customer Profile"
      noticeTitle="Important Notice"
      noticeDescription="Deactivating this customer will remove them from active directories and future bookings. Historical transaction records (such as appointments, invoices, and memberships) will remain fully intact in accordance with auditing regulations."
    />
  );
}
