"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useService } from "../../hooks/services/useService";
import { useServiceCategories } from "../../hooks/categories/useServiceCategories";
import { useUpdateService } from "../../hooks/services/useUpdateService";
import { useDeleteService } from "../../hooks/services/useDeleteService";
import { useReactivateService } from "../../hooks/services/useReactivateService";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import { SERVICES_CONFIG } from "../../config/services.config";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import Unauthorized from "@/components/layout/Unauthorized";
import { ServiceProfileHeader } from "./ServiceProfileHeader";
import { EntityProfileLayout, type ProfileTabItem } from "@/components/entity/EntityProfileLayout";
import { ServiceOverviewCard } from "./ServiceOverviewCard";
import { ServicePricingCard } from "./ServicePricingCard";
import { ServiceTaxCard } from "./ServiceTaxCard";
import { ServiceAuditCard } from "./ServiceAuditCard";
import ServiceForm from "../services/ServiceForm";
import DeactivateDialog from "@/components/entity/DeactivateDialog";
import ReactivateDialog from "@/components/entity/ReactivateDialog";
import type { ServicePayload } from "../../types/service.types";
import type { ServiceCategory } from "../../types/category.types";
import { getErrorMessage } from "@/lib/api/errors";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Calendar, Package, Gift } from "lucide-react";

interface ServiceProfilePageProps {
  serviceId: string;
}

export default function ServiceProfilePage({ serviceId }: ServiceProfilePageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { availableBranches } = useBranchContext();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isReactivateOpen, setIsReactivateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const canEdit = hasPermission(user, SERVICES_CONFIG.permissions.edit);
  const canDelete = hasPermission(user, SERVICES_CONFIG.permissions.delete);
  const canView = hasPermission(user, SERVICES_CONFIG.permissions.view);

  // Queries
  const { data: service, isLoading, isError, error, refetch, isRefetching } = useService(serviceId);
  const categoriesQuery = useServiceCategories({ limit: 100 });

  // Mutations
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();
  const reactivateMutation = useReactivateService();

  const handleEditSubmit = (values: ServicePayload) => {
    updateMutation.mutate(
      { id: serviceId, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          toast.success("Service details updated successfully.");
        },
        onError: (err) => {
          toast.error(getErrorMessage(err) || "Failed to update service.");
        },
      }
    );
  };

  const handleDeactivateConfirm = () => {
    deleteMutation.mutate(serviceId, {
      onSuccess: () => {
        setIsDeactivateOpen(false);
        toast.success("Service deactivated successfully.");
        setTimeout(() => {
          router.back();
        }, 1000);
      },
      onError: (err) => {
        setIsDeactivateOpen(false);
        toast.error(getErrorMessage(err) || "Failed to deactivate service.");
      },
    });
  };

  const handleReactivateConfirm = () => {
    reactivateMutation.mutate(serviceId, {
      onSuccess: () => {
        setIsReactivateOpen(false);
        toast.success("Service reactivated successfully.");
      },
      onError: (err) => {
        toast.error(getErrorMessage(err) || "Failed to reactivate service.");
      },
    });
  };

  if (!canView) {
    return <Unauthorized />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="h-9 w-36 bg-muted rounded-lg" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-muted rounded-lg" />
            <div className="h-9 w-28 bg-muted rounded-lg" />
          </div>
        </div>

        <div className="p-6 bg-card border border-border/80 rounded-xl shadow-sm h-32 flex items-center justify-between" />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-muted rounded-lg" />
            ))}
          </div>
          <div className="lg:col-span-3 h-96 bg-card border border-border/80 rounded-xl shadow-sm" />
        </div>
      </div>
    );
  }

  if (isError || !service) {
    const errorObj = error as Record<string, unknown> | null;
    const responseObj = errorObj?.response as Record<string, unknown> | null;
    const status = (responseObj?.status as number | undefined) || (errorObj?.status as number | undefined);

    if (status === 403) {
      return <Unauthorized />;
    }
    return (
      <ErrorState
        title="Service Not Found"
        description="The requested service treatment could not be retrieved. It may have been deleted or you may not have permission."
        retryAction={{
          label: "Try Again",
          onClick: () => refetch(),
          isLoading: isRefetching,
        }}
      />
    );
  }

  const catId = typeof service.categoryId === "string" ? service.categoryId : (service.categoryId as { _id: string })?._id || "";
  const categoryName = categoriesQuery.data?.data?.find((c: ServiceCategory) => c.id === catId)?.name || catId;
  const branchName = availableBranches.find((b) => b.id === service.branchId)?.name || service.branchId;

  // Declarative Tab Schema Definition
  const tabs: ProfileTabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "employees", label: "Certified Staff" },
    { id: "appointments", label: "Appointments History" },
    { id: "inventory", label: "Inventory Used" },
    { id: "packages", label: "Packages & Promos" },
  ];

  return (
    <div className="space-y-6">

      <ServiceProfileHeader
        service={service}
        canEdit={canEdit}
        canDelete={canDelete}
        categoryName={categoryName}
        onBack={() => router.back()}
        onEdit={() => setIsEditOpen(true)}
        onDeactivate={() => setIsDeactivateOpen(true)}
        onReactivate={() => setIsReactivateOpen(true)}
      />

      <EntityProfileLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === "overview" && (
          <div className="space-y-6">
            <ServiceOverviewCard service={service} categoryName={categoryName} />
            <ServicePricingCard service={service} />
            <ServiceTaxCard service={service} />
            <ServiceAuditCard service={service} branchName={branchName} />
          </div>
        )}

        {activeTab === "employees" && (
          <EmptyState
            icon={Users}
            title="No Certified Staff Linked"
            description="Employees and treatment certifications will be linked here in future updates."
          />
        )}

        {activeTab === "appointments" && (
          <EmptyState
            icon={Calendar}
            title="No Bookings Yet"
            description="Appointment booking statistics for this treatment will appear here."
          />
        )}

        {activeTab === "inventory" && (
          <EmptyState
            icon={Package}
            title="No Material Consumption Linked"
            description="Inventory and treatment consumable deductions will be tracked here in future updates."
          />
        )}

        {activeTab === "packages" && (
          <EmptyState
            icon={Gift}
            title="No Packages Linked"
            description="Active promotion campaigns or bundle discounts for this treatment will be shown here."
          />
        )}
      </EntityProfileLayout>

      {/* Edit Dialog Modal */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Service Details">
        <ServiceForm
          categories={categoriesQuery.data?.data || []}
          initialService={{
            name: service.name,
            description: service.description || "",
            categoryId: catId,
            duration: service.duration,
            basePrice: service.pricing?.basePrice ?? 0,
            taxable: service.taxable,
            taxRate: service.taxRate ?? 0,
            displayOrder: service.displayOrder,
          }}
          onSubmit={handleEditSubmit}
          isSubmitting={updateMutation.isPending}
          onCancel={() => setIsEditOpen(false)}
          error={updateMutation.error}
        />
      </Dialog>

      {/* Deactivate Dialog */}
      <DeactivateDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={handleDeactivateConfirm}
        isDeleting={deleteMutation.isPending}
        itemName={service.name}
        title="Deactivate Service Record"
      />

      {/* Reactivate Dialog */}
      <ReactivateDialog
        isOpen={isReactivateOpen}
        onClose={() => setIsReactivateOpen(false)}
        onConfirm={handleReactivateConfirm}
        isLoading={reactivateMutation.isPending}
        error={reactivateMutation.error}
        itemName={service.name}
        title="Reactivate Service Record"
      />
    </div>
  );
}
