"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useEmployee, useUpdateEmployee, useDeleteEmployee, useUpdateEmployeeStatus } from "../hooks/useEmployees";
import type { EmployeePayload } from "../types/employee.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmployeeForm from "./EmployeeForm";
import EmployeeDeleteDialog from "./EmployeeDeleteDialog";
import EmployeeReactivateDialog from "./EmployeeReactivateDialog";
import Unauthorized from "@/components/layout/Unauthorized";
import { EmployeeProfileHeader } from "./EmployeeProfileHeader";
import { EmployeeOverview } from "./EmployeeOverview";
import { EntityProfileLayout, type ProfileTabItem } from "@/components/entity/EntityProfileLayout";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { useServices } from "@/features/services/hooks/services/useServices";
import { toast } from "sonner";

interface EmployeeDetailsPageProps {
  employeeId: string;
}

const TABS: ProfileTabItem[] = [
  { id: "overview", label: "Overview" },
];

export default function EmployeeDetailsPage({ employeeId }: EmployeeDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { branches } = useBranches();
  const { data: servicesData } = useServices({ limit: 100 });
  const servicesList = servicesData?.data || [];

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isReactivateOpen, setIsReactivateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabItem["id"]>("overview");

  const canEdit = hasPermission(user, "employees.edit");
  const canDelete = hasPermission(user, "employees.delete");
  const canView = hasPermission(user, "employees.view");

  const { data: employee, isLoading, isError, refetch, isRefetching } = useEmployee(employeeId);

  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const reactivateMutation = useUpdateEmployeeStatus();

  const handleEditSubmit = (values: EmployeePayload) => {
    updateMutation.mutate(
      { id: employeeId, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          toast.success("Employee profile updated successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to update employee.");
        },
      }
    );
  };

  const handleDeactivateConfirm = () => {
    deleteMutation.mutate(employeeId, {
      onSuccess: () => {
        setIsDeactivateOpen(false);
        toast.success("Employee profile deactivated successfully.");
        setTimeout(() => {
          router.back();
        }, 1000);
      },
      onError: (err: Error) => {
        setIsDeactivateOpen(false);
        toast.error(err.message || "Failed to deactivate employee.");
      },
    });
  };

  const handleReactivateConfirm = () => {
    reactivateMutation.mutate(
      { id: employeeId, status: "active" },
      {
        onSuccess: () => {
          setIsReactivateOpen(false);
          reactivateMutation.reset();
          toast.success("Employee profile reactivated successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to reactivate employee.");
        },
      }
    );
  };

  if (!canView) {
    return <Unauthorized />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Action Row Skeleton */}
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="h-9 w-36 bg-muted rounded-lg" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-muted rounded-lg" />
            <div className="h-9 w-28 bg-muted rounded-lg" />
          </div>
        </div>

        {/* Identity Summary Card Skeleton */}
        <div className="p-6 bg-card border border-border/80 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-6 w-48 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded-full" />
              </div>
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-20 bg-muted rounded-lg" />
            <div className="h-9 w-20 bg-muted rounded-lg" />
          </div>
        </div>

        {/* Split Tabs Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-1">
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
          <div className="lg:col-span-3">
            <div className="h-64 bg-card border border-border/85 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <ErrorState
        title="Failed to Load Profile"
        description="The employee record could not be retrieved. Please check your connection and try again."
        retryAction={{
          label: "Try Reconnecting",
          onClick: () => refetch(),
          isLoading: isRefetching,
        }}
      />
    );
  }

  // Resolve human-readable names
  const resolvedBranchNames = employee.branchIds
    .map((id) => branches.find((b) => b.id === id)?.name || "")
    .filter(Boolean);

  const resolvedSpecialties = (employee.specialties || [])
    .map((id) => servicesList.find((s) => s.id === id)?.name || "")
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <EmployeeProfileHeader
        employee={employee}
        branchNames={resolvedBranchNames.join(", ")}
        canEdit={canEdit}
        canDelete={canDelete}
        onBack={() => router.back()}
        onEdit={() => setIsEditOpen(true)}
        onDeactivate={() => setIsDeactivateOpen(true)}
        onReactivate={() => setIsReactivateOpen(true)}
      />

      {/* Tabbed Layout Composition */}
      <EntityProfileLayout tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "overview" && (
          <EmployeeOverview
            employee={employee}
            resolvedBranchNames={resolvedBranchNames}
            resolvedSpecialties={resolvedSpecialties}
          />
        )}
      </EntityProfileLayout>

      {/* Edit Profile Modal Dialog */}
      {isEditOpen && (
        <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Employee Details">
          <EmployeeForm
            initialEmployee={employee}
            onSubmit={handleEditSubmit}
            isSubmitting={updateMutation.isPending}
            onCancel={() => setIsEditOpen(false)}
            submitLabel="Update Employee"
            error={updateMutation.error}
          />
        </Dialog>
      )}

      {/* Delete/Deactivate Dialog */}
      {isDeactivateOpen && (
        <EmployeeDeleteDialog
          isOpen={isDeactivateOpen}
          onClose={() => setIsDeactivateOpen(false)}
          onConfirm={handleDeactivateConfirm}
          isDeleting={deleteMutation.isPending}
          employeeName={`${employee.firstName} ${employee.lastName}`}
        />
      )}

      {/* Reactivate Dialog */}
      {isReactivateOpen && (
        <EmployeeReactivateDialog
          isOpen={isReactivateOpen}
          onClose={() => {
            setIsReactivateOpen(false);
            reactivateMutation.reset();
          }}
          onConfirm={handleReactivateConfirm}
          isLoading={reactivateMutation.isPending}
          error={reactivateMutation.error}
          employeeName={`${employee.firstName} ${employee.lastName}`}
        />
      )}
    </div>
  );
}
