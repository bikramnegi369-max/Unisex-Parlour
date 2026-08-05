import React from "react";
import DeactivateDialog from "@/components/entity/DeactivateDialog";

interface EmployeeDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  employeeName: string;
}

export default function EmployeeDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  employeeName,
}: EmployeeDeleteDialogProps) {
  return (
    <DeactivateDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
      itemName={employeeName}
      title="Deactivate Employee Profile"
      noticeTitle="Scheduling & Operational Warning"
      noticeDescription="Deactivating this employee will prevent them from being assigned to any future bookings, shifts, or commissions. Their past appointment history, sales reports, and historical payroll metrics will remain intact for auditing compliance."
    />
  );
}
