"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useServiceCategories } from "../../hooks/categories/useServiceCategories";
import { useCreateServiceCategory } from "../../hooks/categories/useCreateServiceCategory";
import { useUpdateServiceCategory } from "../../hooks/categories/useUpdateServiceCategory";
import { useDeleteServiceCategory } from "../../hooks/categories/useDeleteServiceCategory";
import { useReactivateServiceCategory } from "../../hooks/categories/useReactivateServiceCategory";
import { SERVICES_CONFIG } from "../../config/services.config";
import { buildServiceCategoryColumns } from "../../columns/serviceCategoryColumns";
import { ServicesListHeader } from "./ServicesListHeader";
import { ServicesSearch } from "./ServicesSearch";
import { ServiceCategoryMobileCard } from "./ServiceCategoryMobileCard";
import ServiceCategoryForm from "../service-categories/ServiceCategoryForm";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import DeactivateDialog from "@/components/entity/DeactivateDialog";
import ReactivateDialog from "@/components/entity/ReactivateDialog";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import type { ServiceCategory, ServiceCategoryPayload } from "../../types/category.types";
import { getErrorMessage } from "@/lib/api/errors";
import { capitalizeWords } from "@/lib/formatters";

export default function ServiceCategoriesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { user } = useAuth();
  const { isAllBranchesSelected, getBranchName } = useBranchContext();

  const canCreate = hasPermission(user, SERVICES_CONFIG.permissions.create);
  const canEdit = hasPermission(user, SERVICES_CONFIG.permissions.edit);
  const canDelete = hasPermission(user, SERVICES_CONFIG.permissions.delete);

  // Read params from URL
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || String(SERVICES_CONFIG.defaults.pageSize));
  const searchVal = searchParams.get("search") || "";
  const statusVal = searchParams.get("status") || "all";

  // Local state for search responsiveness
  const [search, setSearch] = useState(searchVal);
  const [prevSearchVal, setPrevSearchVal] = useState(searchVal);

  if (searchVal !== prevSearchVal) {
    setPrevSearchVal(searchVal);
    setSearch(searchVal);
  }

  // Modals and dialog states
  const [isCategoryCreateOpen, setIsCategoryCreateOpen] = useState(false);
  const [isCategoryEditOpen, setIsCategoryEditOpen] = useState(false);
  const [isCategoryDeleteOpen, setIsCategoryDeleteOpen] = useState(false);
  const [isCategoryReactivateOpen, setIsCategoryReactivateOpen] = useState(false);

  const [activeCategory, setActiveCategory] = useState<ServiceCategory | null>(null);

  // Queries
  const categoriesQuery = useServiceCategories({
    search: searchVal || undefined,
    page: page,
    limit: limit,
    status: statusVal !== "all" ? statusVal : undefined,
  });

  const handleSync = async () => {
    try {
      await categoriesQuery.refetch();
      toast.success("Service categories synchronized successfully.");
    } catch {
      toast.error("Failed to synchronize service categories.");
    }
  };

  // Mutation hooks
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
        getBranchName,
        isAllBranches: isAllBranchesSelected,
      }),
    [getBranchName, isAllBranchesSelected]
  );

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
      isAllBranches={isAllBranchesSelected}
      getBranchName={getBranchName}
    />
  );

  return (
    <div className="space-y-6">
      <ServicesListHeader
        viewMode="categories"
        onAddClick={() => setIsCategoryCreateOpen(true)}
        canCreate={canCreate}
        isAllBranchesSelected={isAllBranchesSelected}
        isSyncing={categoriesQuery.isRefetching}
        onSync={handleSync}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
          <ServicesSearch
            value={search}
            onChange={setSearch}
            placeholder="Search categories by name..."
            isLoading={categoriesQuery.isFetching}
          />
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
          isLoading={categoriesQuery.isLoading || categoriesQuery.isRefetching}
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

      {/* Category Create Modal */}
      <Dialog
        isOpen={isCategoryCreateOpen}
        onClose={() => setIsCategoryCreateOpen(false)}
        title="Create Service Category"
      >
        <ServiceCategoryForm
          onSubmit={handleCategoryCreateSubmit}
          isSubmitting={createCategoryMutation.isPending}
          onCancel={() => setIsCategoryCreateOpen(false)}
          error={createCategoryMutation.error}
        />
      </Dialog>

      {/* Category Edit Modal */}
      <Dialog
        isOpen={isCategoryEditOpen && !!activeCategory}
        onClose={() => setIsCategoryEditOpen(false)}
        title="Edit Category"
      >
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

      {/* Category Delete Dialog */}
      <DeactivateDialog
        isOpen={isCategoryDeleteOpen}
        onClose={() => setIsCategoryDeleteOpen(false)}
        onConfirm={handleCategoryDeleteConfirm}
        isDeleting={deleteCategoryMutation.isPending}
        itemName={activeCategory?.name ? capitalizeWords(activeCategory.name) : ""}
        title="Deactivate Category"
      />

      {/* Category Reactivate Dialog */}
      <ReactivateDialog
        isOpen={isCategoryReactivateOpen}
        onClose={() => setIsCategoryReactivateOpen(false)}
        onConfirm={handleCategoryReactivateConfirm}
        isLoading={reactivateCategoryMutation.isPending}
        error={reactivateCategoryMutation.error}
        itemName={activeCategory?.name ? capitalizeWords(activeCategory.name) : ""}
        title="Reactivate Category"
      />
    </div>
  );
}
