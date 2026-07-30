"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCustomer } from "../hooks/useCustomer";
import { useUpdateCustomer } from "../hooks/useUpdateCustomer";
import { useDeleteCustomer } from "../hooks/useDeleteCustomer";
import { useReactivateCustomer } from "../hooks/useReactivateCustomer";
import { type CustomerPayload } from "../types/customer.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import CustomerForm from "./CustomerForm";
import CustomerDeleteDialog from "./CustomerDeleteDialog";
import CustomerReactivateDialog from "./CustomerReactivateDialog";
import Unauthorized from "@/components/layout/Unauthorized";
import { CustomerProfileHeader } from "./CustomerProfileHeader";
import { CustomerDetailsTabs, type TabItem } from "./CustomerDetailsTabs";
import { CustomerOverview } from "./CustomerOverview";
import { CustomerPreferences } from "./CustomerPreferences";
import { CustomerNotes } from "./CustomerNotes";
import { CustomerActivityLog } from "./CustomerActivityLog";

interface CustomerDetailsPageProps {
  customerId: string;
}

export default function CustomerDetailsPage({ customerId }: CustomerDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { availableBranches } = useBranchContext();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isReactivateOpen, setIsReactivateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabItem["id"]>("overview");
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canEdit = hasPermission(user, "customers.edit");
  const canDelete = hasPermission(user, "customers.delete");
  const canView = hasPermission(user, "customers.view");

  const { data: customer, isLoading, isError, error, refetch, isRefetching } = useCustomer(customerId);

  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();
  const reactivateMutation = useReactivateCustomer();

  // Reset mutation state when dialog closes
  useEffect(() => {
    if (!isReactivateOpen) {
      reactivateMutation.reset();
    }
  }, [isReactivateOpen, reactivateMutation]);


  const triggerAlert = (type: "success" | "error", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handleEditSubmit = (values: CustomerPayload) => {
    updateMutation.mutate(
      { id: customerId, payload: values },
      {
         onSuccess: () => {
          setIsEditOpen(false);
          triggerAlert("success", "Customer profile updated successfully.");
        },
        onError: (err: Error) => {
          triggerAlert("error", err.message || "Failed to update customer.");
        },
      }
    );
  };

  const handleDeactivateConfirm = () => {
    deleteMutation.mutate(customerId, {
      onSuccess: () => {
        setIsDeactivateOpen(false);
        triggerAlert("success", "Customer profile deactivated successfully.");
        // Redirect back to list after short delay so user sees success feedback
        setTimeout(() => {
          router.back();
        }, 1000);
      },
      onError: (err: Error) => {
        setIsDeactivateOpen(false);
        triggerAlert("error", err.message || "Failed to deactivate customer.");
      },
    });
  };

  const handleReactivateConfirm = () => {
    reactivateMutation.mutate(customerId, {
      onSuccess: () => {
        setIsReactivateOpen(false);
        triggerAlert("success", "Customer profile reactivated successfully.");
      },
      onError: () => {
        // Keep the dialog open and display mutation error state internally
      },
    });
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

        {/* Profile Card Identity Summary Skeleton */}
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

        {/* Split Tabs Navigation and Contents Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tab Sidebar Navigation Skeleton */}
          <div className="lg:col-span-1 space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-muted rounded-lg" />
            ))}
          </div>

          {/* Tab Contents Card Skeleton */}
          <div className="lg:col-span-3">
            <div className="border border-border/80 rounded-xl bg-card shadow-sm h-96 p-6 space-y-6">
              <div className="border-b border-border/85 pb-4">
                <div className="h-5 w-32 bg-muted rounded" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-muted rounded" />
                    <div className="h-5 w-full bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    const errorObj = error as Record<string, unknown> | null;
    const responseObj = errorObj?.response as Record<string, unknown> | null;
    const status = (responseObj?.status as number | undefined) || (errorObj?.status as number | undefined);
    
    if (status === 403) {
      return <Unauthorized />;
    }
    return (
      <ErrorState
        title="Customer Not Found"
        description="The requested customer profile could not be retrieved. It may have been deactivated or you may not have access."
        retryAction={{
          label: "Try Again",
          onClick: () => refetch(),
          isLoading: isRefetching,
        }}
      />
    );
  }

  const homeBranchName =
    availableBranches.find((b) => b.id === customer.homeBranchId)?.name ||
    customer.homeBranchId;

  const visitedBranchNames = customer.visitedBranchIds
    .map((id : string) => availableBranches.find((b) => b.id === id)?.name || id)
    .join(", ");



  const tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "preferences", label: "Preferences" },
    { id: "notes", label: "Internal Notes" },
    { id: "activity", label: "Activity Log" },
  ];

  return (
    <div className="space-y-6">
      {/* Alert message banner */}
      {alertMessage && (
        <div
          className={`p-3 rounded-lg border text-sm font-semibold animate-in fade-in duration-200 ${
            alertMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {alertMessage.text}
        </div>
      )}

      {/* Header Profile Identity summary block */}
      <CustomerProfileHeader
        customer={customer}
        homeBranchName={homeBranchName}
        canEdit={canEdit}
        canDelete={canDelete}
        onBack={() => router.back()}
        onEdit={() => setIsEditOpen(true)}
        onDeactivate={() => setIsDeactivateOpen(true)}
        onReactivate={() => setIsReactivateOpen(true)}
      />

      {/* Main Tabs Navigation and Contents Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <CustomerDetailsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={tabs}
          />
        </div>

        <div className="lg:col-span-3">
          {activeTab === "overview" && (
            <CustomerOverview customer={customer} visitedBranchNames={visitedBranchNames} />
          )}

          {activeTab === "preferences" && (
            <CustomerPreferences
              preferences={customer.preferences}
              marketingPreferences={customer.marketingPreferences}
            />
          )}

          {activeTab === "notes" && (
            <CustomerNotes customerId={customerId} />
          )}

          {activeTab === "activity" && (
            <CustomerActivityLog customerId={customerId} />
          )}
        </div>
      </div>

      {/* Edit Form Modal dialog */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Customer Details">
        <CustomerForm
          initialCustomer={customer}
          onSubmit={handleEditSubmit}
          isSubmitting={updateMutation.isPending}
          onCancel={() => setIsEditOpen(false)}
          submitLabel="Update Customer"
        />
      </Dialog>

      {/* Deactivate confirmation dialog */}
      <CustomerDeleteDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={handleDeactivateConfirm}
        isDeleting={deleteMutation.isPending}
        customerName={customer.name}
      />

      {/* Reactivate confirmation dialog */}
      <CustomerReactivateDialog
        isOpen={isReactivateOpen}
        onClose={() => setIsReactivateOpen(false)}
        onConfirm={handleReactivateConfirm}
        isLoading={reactivateMutation.isPending}
        error={reactivateMutation.error}
        customerName={customer.name}
      />
    </div>
  );
}
