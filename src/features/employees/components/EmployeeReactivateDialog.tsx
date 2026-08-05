import React from "react";
import ReactivateDialog from "@/components/entity/ReactivateDialog";

interface EmployeeReactivateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  error: Error | null;
  employeeName: string;
}

export default function EmployeeReactivateDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  error,
  employeeName,
}: EmployeeReactivateDialogProps) {
  return (
    <ReactivateDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      error={error}
      itemName={employeeName}
      title="Reactivate Employee Profile"
      noticeTitle="Status Restoration"
      noticeDescription="Reactivating this employee will restore their active status, making them available for future shifts, appointments, schedules, and active commission tracking."
    />
  );
}
