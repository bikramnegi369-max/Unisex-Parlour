"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useServices } from "../../hooks/services/useServices";
import { useCreateService } from "../../hooks/services/useCreateService";
import { useUpdateService } from "../../hooks/services/useUpdateService";
import { useDeleteService } from "../../hooks/services/useDeleteService";
import { useReactivateService } from "../../hooks/services/useReactivateService";
import { useServiceCategories } from "../../hooks/categories/useServiceCategories";
import { SERVICES_CONFIG } from "../../config/services.config";
import { buildServiceColumns } from "../../columns/serviceColumns";
import { ServicesListHeader } from "./ServicesListHeader";
import { ServicesSearch } from "./ServicesSearch";
import { ServicesFilters } from "./ServicesFilters";
import { ServiceMobileCard } from "./ServiceMobileCard";
import ServiceForm from "../services/ServiceForm";
import { Dialog } from "@/components/ui/dialog";
import DeactivateDialog from "@/components/entity/DeactivateDialog";
import ReactivateDialog from "@/components/entity/ReactivateDialog";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import type { Service, ServicePayload } from "../../types/service.types";
import type { ServiceCategory } from "../../types/category.types";
import { getErrorMessage } from "@/lib/api/errors";
import { capitalizeWords } from "@/lib/formatters";

export default function ServicesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { user } = useAuth();
  const { currentBranch, isAllBranchesSelected, getBranchName } =
    useBranchContext();

  const canCreate = hasPermission(user, SERVICES_CONFIG.permissions.create);
  const canEdit = hasPermission(user, SERVICES_CONFIG.permissions.edit);
  const canDelete = hasPermission(user, SERVICES_CONFIG.permissions.delete);

  // Read params from URL
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(
    searchParams.get("limit") || String(SERVICES_CONFIG.defaults.pageSize),
  );
  const searchVal = searchParams.get("search") || "";
  const statusVal = searchParams.get("status") || "all";
  const categoryIdVal = searchParams.get("categoryId") || "all";
  const sortVal = searchParams.get("sort") || "";

  // Local state for search responsiveness
  const [search, setSearch] = useState(searchVal);
  const [debouncedSearch, setDebouncedSearch] = useState(searchVal);
  const [prevSearchVal, setPrevSearchVal] = useState(searchVal);

  if (searchVal !== prevSearchVal) {
    setPrevSearchVal(searchVal);
    setSearch(searchVal);
    setDebouncedSearch(searchVal);
  }

  // Modals and dialog states
  const [isServiceCreateOpen, setIsServiceCreateOpen] = useState(false);
  const [isServiceEditOpen, setIsServiceEditOpen] = useState(false);
  const [isServiceDeleteOpen, setIsServiceDeleteOpen] = useState(false);
  const [isServiceReactivateOpen, setIsServiceReactivateOpen] = useState(false);

  const [activeService, setActiveService] = useState<Service | null>(null);

  // Queries (Simple query for categories lookup list, and main services query)
  const categoriesQuery = useServiceCategories({
    limit: 100,
  });
  const servicesQuery = useServices({
    search: searchVal || undefined,
    page: page,
    limit: limit,
    status: statusVal !== "all" ? statusVal : undefined,
    categoryId: categoryIdVal !== "all" ? categoryIdVal : undefined,
    sort: sortVal || undefined,
  });

  const handleSync = async () => {
    try {
      await servicesQuery.refetch();
      toast.success("Services catalog synchronized successfully.");
    } catch {
      toast.error("Failed to synchronize services catalog.");
    }
  };

  // Mutation hooks
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const reactivateServiceMutation = useReactivateService();

  // Navigation helpers for pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newPageSize.toString());
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Debounce search input
  useEffect(() => {
    if (search === "") {
      setDebouncedSearch("");
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync debounced search with URL
  useEffect(() => {
    const currentQuery = searchParams.get("search") || "";
    if (debouncedSearch !== currentQuery) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [debouncedSearch, router, pathname, searchParams]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    if (searchVal) {
      params.set("search", searchVal);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const getCategoryName = useCallback(
    (id: string) => {
      return (
        categoriesQuery.data?.data?.find((c: ServiceCategory) => c.id === id)
          ?.name || id
      );
    },
    [categoriesQuery.data],
  );

  // Table Columns Definition
  const serviceColumns = useMemo(
    () =>
      buildServiceColumns({
        onView: (service) =>
          router.push(SERVICES_CONFIG.routes.services.detail(service.id)),
        onEdit: (service) => {
          setActiveService(service);
          setIsServiceEditOpen(true);
        },
        onDelete: (service) => {
          setActiveService(service);
          setIsServiceDeleteOpen(true);
        },
        onReactivate: (service) => {
          setActiveService(service);
          setIsServiceReactivateOpen(true);
        },
        getCategoryName,
        getBranchName,
        isAllBranches: isAllBranchesSelected,
      }),
    [router, getCategoryName, getBranchName, isAllBranchesSelected],
  );

  // Form submit handlers
  const handleServiceCreateSubmit = (values: ServicePayload) => {
    createServiceMutation.mutate(values, {
      onSuccess: () => {
        setIsServiceCreateOpen(false);
        toast.success("New service added to catalog successfully.");
      },
      onError: (err) => {
        toast.error(getErrorMessage(err) || "Failed to create service.");
      },
    });
  };

  const handleServiceEditSubmit = (values: ServicePayload) => {
    if (!activeService) return;
    updateServiceMutation.mutate(
      { id: activeService.id, payload: values },
      {
        onSuccess: () => {
          setIsServiceEditOpen(false);
          setActiveService(null);
          toast.success("Service details updated successfully.");
        },
        onError: (err) => {
          toast.error(getErrorMessage(err) || "Failed to update service.");
        },
      },
    );
  };

  const handleServiceDeleteConfirm = () => {
    if (!activeService) return;
    deleteServiceMutation.mutate(activeService.id, {
      onSuccess: () => {
        setIsServiceDeleteOpen(false);
        setActiveService(null);
        toast.success("Service deactivated successfully.");
      },
      onError: (err) => {
        setIsServiceDeleteOpen(false);
        setActiveService(null);
        toast.error(getErrorMessage(err) || "Failed to deactivate service.");
      },
    });
  };

  const handleServiceReactivateConfirm = () => {
    if (!activeService) return;
    reactivateServiceMutation.mutate(activeService.id, {
      onSuccess: () => {
        setIsServiceReactivateOpen(false);
        setActiveService(null);
        toast.success("Service reactivated successfully.");
      },
      onError: (err) => {
        setIsServiceReactivateOpen(false);
        setActiveService(null);
        toast.error(getErrorMessage(err) || "Failed to reactivate service.");
      },
    });
  };

  // Mobile list row builder
  const renderMobileRow = (service: Service) => (
    <ServiceMobileCard
      key={service.id}
      service={service}
      categoryName={getCategoryName(
        typeof service.categoryId === "string"
          ? service.categoryId
          : (service.categoryId as { _id: string })?._id || "",
      )}
      onView={() =>
        router.push(SERVICES_CONFIG.routes.services.detail(service.id))
      }
      onEdit={() => {
        setActiveService(service);
        setIsServiceEditOpen(true);
      }}
      onDelete={() => {
        setActiveService(service);
        setIsServiceDeleteOpen(true);
      }}
      onReactivate={() => {
        setActiveService(service);
        setIsServiceReactivateOpen(true);
      }}
      canEdit={canEdit}
      canDelete={canDelete}
      isAllBranches={isAllBranchesSelected}
      getBranchName={getBranchName}
    />
  );

  return (
    <div className="space-y-6">
      <ServicesListHeader
        viewMode="services"
        onAddClick={() => setIsServiceCreateOpen(true)}
        canCreate={canCreate}
        isAllBranchesSelected={isAllBranchesSelected}
        isSyncing={servicesQuery.isRefetching}
        onSync={handleSync}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
          <ServicesSearch
            value={search}
            onChange={setSearch}
            isLoading={servicesQuery.isFetching}
          />
          <ServicesFilters
            status={statusVal}
            onStatusChange={(val) => updateParam("status", val)}
            categoryId={categoryIdVal}
            onCategoryIdChange={(val) => updateParam("categoryId", val)}
            categories={categoriesQuery.data?.data || []}
            sort={sortVal}
            onSortChange={(val) => updateParam("sort", val)}
            onClearFilters={handleClearFilters}
            activeScopeName={
              currentBranch ? currentBranch.name : "All Branches"
            }
            isRefetching={servicesQuery.isRefetching}
          />
        </div>

        <DataTable
          columns={serviceColumns}
          data={servicesQuery.data?.data || []}
          isLoading={servicesQuery.isLoading || servicesQuery.isRefetching}
          renderMobileRow={renderMobileRow}
          getRowClassName={(row) =>
            !row.isActive ? "opacity-60 bg-muted/50" : ""
          }
          emptyState={
            <EmptyState
              title={SERVICES_CONFIG.labels.service.emptyStateTitle}
              description={SERVICES_CONFIG.labels.service.emptyStateDescription}
              action={
                canCreate && !isAllBranchesSelected
                  ? {
                      label: "Create Service",
                      onClick: () => setIsServiceCreateOpen(true),
                    }
                  : undefined
              }
            />
          }
        />

        {servicesQuery.data?.meta && (
          <Pagination
            currentPage={page}
            totalPages={servicesQuery.data.meta.totalPages}
            totalItems={servicesQuery.data.meta.total}
            onPageChange={handlePageChange}
            pageSize={limit}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="services"
          />
        )}
      </div>

      {/* Service Create Modal */}
      <Dialog
        isOpen={isServiceCreateOpen}
        onClose={() => setIsServiceCreateOpen(false)}
        title="Create New Service"
      >
        <ServiceForm
          categories={categoriesQuery.data?.data || []}
          onSubmit={handleServiceCreateSubmit}
          isSubmitting={createServiceMutation.isPending}
          onCancel={() => setIsServiceCreateOpen(false)}
          error={createServiceMutation.error}
        />
      </Dialog>

      {/* Service Edit Modal */}
      <Dialog
        isOpen={isServiceEditOpen && !!activeService}
        onClose={() => setIsServiceEditOpen(false)}
        title="Edit Service Details"
      >
        {activeService && (
          <ServiceForm
            categories={categoriesQuery.data?.data || []}
            initialService={{
              name: activeService.name,
              description: activeService.description || "",
              categoryId:
                typeof activeService.categoryId === "string"
                  ? activeService.categoryId
                  : (activeService.categoryId as { _id: string })?._id || "",
              duration: activeService.duration,
              basePrice: activeService.pricing?.basePrice ?? 0,
              taxable: activeService.taxable,
              taxRate: activeService.taxRate ?? 0,
              displayOrder: activeService.displayOrder,
            }}
            onSubmit={handleServiceEditSubmit}
            isSubmitting={updateServiceMutation.isPending}
            onCancel={() => setIsServiceEditOpen(false)}
            error={updateServiceMutation.error}
          />
        )}
      </Dialog>

      {/* Service Delete Dialog */}
      <DeactivateDialog
        isOpen={isServiceDeleteOpen}
        onClose={() => setIsServiceDeleteOpen(false)}
        onConfirm={handleServiceDeleteConfirm}
        isDeleting={deleteServiceMutation.isPending}
        itemName={
          activeService?.name ? capitalizeWords(activeService.name) : ""
        }
        title="Deactivate Service Record"
      />

      {/* Service Reactivate Dialog */}
      <ReactivateDialog
        isOpen={isServiceReactivateOpen}
        onClose={() => setIsServiceReactivateOpen(false)}
        onConfirm={handleServiceReactivateConfirm}
        isLoading={reactivateServiceMutation.isPending}
        error={reactivateServiceMutation.error}
        itemName={
          activeService?.name ? capitalizeWords(activeService.name) : ""
        }
        title="Reactivate Service Record"
      />
    </div>
  );
}
