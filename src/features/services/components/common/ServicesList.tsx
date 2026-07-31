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
import { useCreateServiceCategory } from "../../hooks/categories/useCreateServiceCategory";
import { useUpdateServiceCategory } from "../../hooks/categories/useUpdateServiceCategory";
import { useDeleteServiceCategory } from "../../hooks/categories/useDeleteServiceCategory";
import { useReactivateServiceCategory } from "../../hooks/categories/useReactivateServiceCategory";
import { SERVICES_CONFIG } from "../../config/services.config";
import { buildServiceColumns } from "../../columns/serviceColumns";
import { buildServiceCategoryColumns } from "../../columns/serviceCategoryColumns";
import { ServicesListHeader } from "./ServicesListHeader";
import { ServicesSearch } from "./ServicesSearch";
import { ServicesFilters } from "./ServicesFilters";
import { ServiceMobileCard } from "./ServiceMobileCard";
import { ServiceCategoryMobileCard } from "./ServiceCategoryMobileCard";
import ServiceForm from "../services/ServiceForm";
import ServiceCategoryForm from "../service-categories/ServiceCategoryForm";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import DeactivateDialog from "@/components/entity/DeactivateDialog";
import ReactivateDialog from "@/components/entity/ReactivateDialog";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import type { Service, ServicePayload } from "../../types/service.types";
import type { ServiceCategory, ServiceCategoryPayload } from "../../types/category.types";
import { getErrorMessage } from "@/lib/api/errors";

export default function ServicesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { user } = useAuth();
  const { currentBranch, isAllBranchesSelected } = useBranchContext();

  const canCreate = hasPermission(user, SERVICES_CONFIG.permissions.create);
  const canEdit = hasPermission(user, SERVICES_CONFIG.permissions.edit);
  const canDelete = hasPermission(user, SERVICES_CONFIG.permissions.delete);

  // View mode switcher: "services" | "categories"
  const [viewMode, setViewMode] = useState<"services" | "categories">("services");

  // Read params from URL
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || String(SERVICES_CONFIG.defaults.pageSize));
  const searchVal = searchParams.get("search") || "";
  const statusVal = searchParams.get("status") || "all";
  const categoryIdVal = searchParams.get("categoryId") || "all";
  const sortVal = searchParams.get("sort") || "";

  // Local state for search responsiveness
  const [search, setSearch] = useState(searchVal);
  const [prevSearchVal, setPrevSearchVal] = useState(searchVal);

  if (searchVal !== prevSearchVal) {
    setPrevSearchVal(searchVal);
    setSearch(searchVal);
  }

  // Modals and dialog states
  const [isServiceCreateOpen, setIsServiceCreateOpen] = useState(false);
  const [isServiceEditOpen, setIsServiceEditOpen] = useState(false);
  const [isServiceDeleteOpen, setIsServiceDeleteOpen] = useState(false);
  const [isServiceReactivateOpen, setIsServiceReactivateOpen] = useState(false);

  const [isCategoryCreateOpen, setIsCategoryCreateOpen] = useState(false);
  const [isCategoryEditOpen, setIsCategoryEditOpen] = useState(false);
  const [isCategoryDeleteOpen, setIsCategoryDeleteOpen] = useState(false);
  const [isCategoryReactivateOpen, setIsCategoryReactivateOpen] = useState(false);

  const [activeService, setActiveService] = useState<Service | null>(null);
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | null>(null);

  // Queries
  const categoriesQuery = useServiceCategories({
    search: viewMode === "categories" ? searchVal || undefined : undefined,
    page: viewMode === "categories" ? page : undefined,
    limit: viewMode === "categories" ? limit : 100,
    status: viewMode === "categories" && statusVal !== "all" ? statusVal : undefined,
  });
  const servicesQuery = useServices({
    search: viewMode === "services" ? searchVal || undefined : undefined,
    page: viewMode === "services" ? page : undefined,
    limit: limit,
    status: viewMode === "services" && statusVal !== "all" ? statusVal : undefined,
    categoryId: categoryIdVal !== "all" ? categoryIdVal : undefined,
    sort: sortVal || undefined,
  });

  // Mutation hooks
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const reactivateServiceMutation = useReactivateService();

  const createCategoryMutation = useCreateServiceCategory();
  const updateCategoryMutation = useUpdateServiceCategory();
  const deleteCategoryMutation = useDeleteServiceCategory();
  const reactivateCategoryMutation = useReactivateServiceCategory();

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

  // Sync search query parameter debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQuery = searchParams.get("search") || "";
      if (search !== currentQuery) {
        const params = new URLSearchParams(searchParams.toString());
        if (search.trim()) {
          params.set("search", search.trim());
        } else {
          params.delete("search");
        }
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, router, pathname, searchParams]);

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

  const getCategoryName = useCallback((id: string) => {
    return categoriesQuery.data?.data?.find((c) => c.id === id)?.name || id;
  }, [categoriesQuery.data]);

  // Table Columns Definition
  const serviceColumns = useMemo(
    () =>
      buildServiceColumns({
        onView: (service) => router.push(SERVICES_CONFIG.routes.services.detail(service.id)),
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
      }),
    [router, getCategoryName]
  );

  const categoryColumns = useMemo(
    () =>
      buildServiceCategoryColumns({
        onEdit: (cat) => {
          setActiveCategory(cat);
          setIsCategoryEditOpen(true);
        },
        onDelete: (cat) => {
          setActiveCategory(cat);
          setIsCategoryDeleteOpen(true);
        },
        onReactivate: (cat) => {
          setActiveCategory(cat);
          setIsCategoryReactivateOpen(true);
        },
      }),
    []
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
      }
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

  // Service Category CRUD Handlers
  const handleCategoryCreateSubmit = (values: ServiceCategoryPayload) => {
    createCategoryMutation.mutate(values, {
      onSuccess: () => {
        setIsCategoryCreateOpen(false);
        toast.success("Category created successfully.");
      },
      onError: (err) => {
        toast.error(getErrorMessage(err) || "Failed to create category.");
      },
    });
  };

  const handleCategoryEditSubmit = (values: ServiceCategoryPayload) => {
    if (!activeCategory) return;
    updateCategoryMutation.mutate(
      { id: activeCategory.id, payload: values },
      {
        onSuccess: () => {
          setIsCategoryEditOpen(false);
          setActiveCategory(null);
          toast.success("Category updated successfully.");
        },
        onError: (err) => {
          toast.error(getErrorMessage(err) || "Failed to update category.");
        },
      }
    );
  };

  const handleCategoryDeleteConfirm = () => {
    if (!activeCategory) return;
    deleteCategoryMutation.mutate(activeCategory.id, {
      onSuccess: () => {
        setIsCategoryDeleteOpen(false);
        setActiveCategory(null);
        toast.success("Category deactivated successfully.");
      },
      onError: (err) => {
        setIsCategoryDeleteOpen(false);
        setActiveCategory(null);
        toast.error(getErrorMessage(err) || "Failed to deactivate category.");
      },
    });
  };

  const handleCategoryReactivateConfirm = () => {
    if (!activeCategory) return;
    reactivateCategoryMutation.mutate(activeCategory.id, {
      onSuccess: () => {
        setIsCategoryReactivateOpen(false);
        setActiveCategory(null);
        toast.success("Category reactivated successfully.");
      },
      onError: (err) => {
        setIsCategoryReactivateOpen(false);
        setActiveCategory(null);
        toast.error(getErrorMessage(err) || "Failed to reactivate category.");
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
          : (service.categoryId as { _id: string })?._id || ""
      )}
      onView={() => router.push(SERVICES_CONFIG.routes.services.detail(service.id))}
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
    />
  );

  // Mobile list row builder for categories
  const renderCategoryMobileRow = (category: ServiceCategory) => (
    <ServiceCategoryMobileCard
      key={category.id}
      category={category}
      canEdit={canEdit}
      canDelete={canDelete}
      onEdit={(cat) => {
        setActiveCategory(cat);
        setIsCategoryEditOpen(true);
      }}
      onDelete={(cat) => {
        setActiveCategory(cat);
        setIsCategoryDeleteOpen(true);
      }}
      onReactivate={(cat) => {
        setActiveCategory(cat);
        setIsCategoryReactivateOpen(true);
      }}
    />
  );

  return (
    <div className="space-y-6">

      <ServicesListHeader
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === "services" ? "categories" : "services")}
        onAddServiceClick={() => setIsServiceCreateOpen(true)}
        onAddCategoryClick={() => setIsCategoryCreateOpen(true)}
        canCreate={canCreate}
        isAllBranchesSelected={isAllBranchesSelected}
      />

      {viewMode === "services" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
            <ServicesSearch value={search} onChange={setSearch} />
            <ServicesFilters
              status={statusVal}
              onStatusChange={(val) => updateParam("status", val)}
              categoryId={categoryIdVal}
              onCategoryIdChange={(val) => updateParam("categoryId", val)}
              categories={categoriesQuery.data?.data || []}
              sort={sortVal}
              onSortChange={(val) => updateParam("sort", val)}
              activeScopeName={currentBranch ? currentBranch.name : "All Branches"}
              isRefetching={servicesQuery.isRefetching}
            />
          </div>

          <DataTable
            columns={serviceColumns}
            data={servicesQuery.data?.data || []}
            isLoading={servicesQuery.isLoading}
            renderMobileRow={renderMobileRow}
            getRowClassName={(row) => (!row.isActive ? "opacity-60 bg-muted/50" : "")}
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
      )}

      {viewMode === "categories" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
            <ServicesSearch value={search} onChange={setSearch} placeholder="Search categories by name..." />
            <div className="flex items-center gap-3">
              <div className="min-w-35">
                <Select
                  value={statusVal}
                  onChange={(e) => updateParam("status", e.target.value)}
                  aria-label="Filter Categories by Status"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </Select>
              </div>
            </div>
          </div>

          <DataTable
            columns={categoryColumns}
            data={categoriesQuery.data?.data || []}
            isLoading={categoriesQuery.isLoading}
            renderMobileRow={renderCategoryMobileRow}
            getRowClassName={(row) => (!row.isActive ? "opacity-60 bg-muted/50" : "")}
            emptyState={
              <EmptyState
                title={SERVICES_CONFIG.labels.category.emptyStateTitle}
                description={SERVICES_CONFIG.labels.category.emptyStateDescription}
                action={
                  canCreate && !isAllBranchesSelected
                    ? {
                        label: "Create Category",
                        onClick: () => setIsCategoryCreateOpen(true),
                      }
                    : undefined
                }
              />
            }
          />

          {categoriesQuery.data?.meta && (
            <Pagination
              currentPage={Number(categoriesQuery.data.meta.page) || 1}
              totalPages={categoriesQuery.data.meta.totalPages}
              totalItems={categoriesQuery.data.meta.total}
              onPageChange={handlePageChange}
              pageSize={limit}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="categories"
            />
          )}
        </div>
      )}

      {/* Service Create Modal */}
      <Dialog isOpen={isServiceCreateOpen} onClose={() => setIsServiceCreateOpen(false)} title="Create New Service">
        <ServiceForm
          categories={categoriesQuery.data?.data || []}
          onSubmit={handleServiceCreateSubmit}
          isSubmitting={createServiceMutation.isPending}
          onCancel={() => setIsServiceCreateOpen(false)}
          error={createServiceMutation.error}
        />
      </Dialog>

      {/* Service Edit Modal */}
      <Dialog isOpen={isServiceEditOpen && !!activeService} onClose={() => setIsServiceEditOpen(false)} title="Edit Service Details">
        {activeService && (
          <ServiceForm
            categories={categoriesQuery.data?.data || []}
            initialService={{
              name: activeService.name,
              description: activeService.description || "",
              categoryId: typeof activeService.categoryId === "string" ? activeService.categoryId : (activeService.categoryId as { _id: string })?._id || "",
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

      {/* Category Create Modal */}
      <Dialog isOpen={isCategoryCreateOpen} onClose={() => setIsCategoryCreateOpen(false)} title="Create Service Category">
        <ServiceCategoryForm
          onSubmit={handleCategoryCreateSubmit}
          isSubmitting={createCategoryMutation.isPending}
          onCancel={() => setIsCategoryCreateOpen(false)}
          error={createCategoryMutation.error}
        />
      </Dialog>

      {/* Category Edit Modal */}
      <Dialog isOpen={isCategoryEditOpen && !!activeCategory} onClose={() => setIsCategoryEditOpen(false)} title="Edit Category">
        {activeCategory && (
          <ServiceCategoryForm
            initialCategory={{
              name: activeCategory.name,
              description: activeCategory.description || "",
              displayOrder: activeCategory.displayOrder,
            }}
            onSubmit={handleCategoryEditSubmit}
            isSubmitting={updateCategoryMutation.isPending}
            onCancel={() => setIsCategoryEditOpen(false)}
            error={updateCategoryMutation.error}
          />
        )}
      </Dialog>

      {/* Service Delete Dialog */}
      <DeactivateDialog
        isOpen={isServiceDeleteOpen}
        onClose={() => setIsServiceDeleteOpen(false)}
        onConfirm={handleServiceDeleteConfirm}
        isDeleting={deleteServiceMutation.isPending}
        itemName={activeService?.name || ""}
        title="Deactivate Service Record"
      />

      {/* Service Reactivate Dialog */}
      <ReactivateDialog
        isOpen={isServiceReactivateOpen}
        onClose={() => setIsServiceReactivateOpen(false)}
        onConfirm={handleServiceReactivateConfirm}
        isLoading={reactivateServiceMutation.isPending}
        error={reactivateServiceMutation.error}
        itemName={activeService?.name || ""}
        title="Reactivate Service Record"
      />

      {/* Category Delete Dialog */}
      <DeactivateDialog
        isOpen={isCategoryDeleteOpen}
        onClose={() => setIsCategoryDeleteOpen(false)}
        onConfirm={handleCategoryDeleteConfirm}
        isDeleting={deleteCategoryMutation.isPending}
        itemName={activeCategory?.name || ""}
        title="Deactivate Category"
      />

      {/* Category Reactivate Dialog */}
      <ReactivateDialog
        isOpen={isCategoryReactivateOpen}
        onClose={() => setIsCategoryReactivateOpen(false)}
        onConfirm={handleCategoryReactivateConfirm}
        isLoading={reactivateCategoryMutation.isPending}
        error={reactivateCategoryMutation.error}
        itemName={activeCategory?.name || ""}
        title="Reactivate Category"
      />
    </div>
  );
}
