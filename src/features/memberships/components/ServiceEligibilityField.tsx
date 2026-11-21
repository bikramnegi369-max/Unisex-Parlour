"use client";

import React, { useState, useMemo } from "react";
import { Tag, ShieldCheck, ShieldAlert, Search, X, Check, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useServiceCategories } from "@/features/services/hooks/categories/useServiceCategories";
import { useServices } from "@/features/services/hooks/services/useServices";
import type { Service } from "@/features/services/types/service.types";
import type { ServiceCategory } from "@/features/services/types/category.types";

interface ServiceEligibilityFieldProps {
  eligibleCategoryIds: string[];
  eligibleServiceIds: string[];
  excludedCategoryIds: string[];
  excludedServiceIds: string[];
  onChange: (updates: {
    eligibleServiceCategoryIds?: string[];
    eligibleServiceIds?: string[];
    excludedServiceCategoryIds?: string[];
    excludedServiceIds?: string[];
  }) => void;
  disabled?: boolean;
}

export function ServiceEligibilityField({
  eligibleCategoryIds = [],
  eligibleServiceIds = [],
  excludedCategoryIds = [],
  excludedServiceIds = [],
  onChange,
  disabled = false,
}: ServiceEligibilityFieldProps) {
  const [activeSubTab, setActiveSubTab] = useState<"inclusions" | "exclusions">("inclusions");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchService, setSearchService] = useState("");

  const { data: serviceCategoriesData, isLoading: isLoadingCats } = useServiceCategories({
    limit: "all",
  });
  const serviceCategories = (serviceCategoriesData?.data || []) as ServiceCategory[];

  const { data: servicesData, isLoading: isLoadingServices } = useServices({
    limit: "all",
  });
  const allServices = ((servicesData?.data || []) as Service[]).filter((s) => s.isActive);

  // Helper mappings
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    serviceCategories.forEach((c) => {
      const id = c.id || (c as { _id?: string })._id;
      if (id) map.set(id, c.name);
    });
    return map;
  }, [serviceCategories]);

  const serviceMap = useMemo(() => {
    const map = new Map<string, Service>();
    allServices.forEach((s) => {
      const id = s.id || (s as { _id?: string })._id;
      if (id) map.set(id, s);
    });
    return map;
  }, [allServices]);

  // Filtered lists
  const filteredCategories = useMemo(() => {
    if (!searchCategory.trim()) return serviceCategories;
    const q = searchCategory.toLowerCase();
    return serviceCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [serviceCategories, searchCategory]);

  const filteredServices = useMemo(() => {
    if (!searchService.trim()) return allServices;
    const q = searchService.toLowerCase();
    return allServices.filter((s) => {
      const catId =
        typeof s.categoryId === "string"
          ? s.categoryId
          : (s.categoryId as { _id?: string; id?: string })?._id ||
            (s.categoryId as { _id?: string; id?: string })?.id;
      const catName = catId ? categoryMap.get(catId)?.toLowerCase() : "";
      return s.name.toLowerCase().includes(q) || Boolean(catName?.includes(q));
    });
  }, [allServices, searchService, categoryMap]);

  // Handlers for Inclusions
  const toggleEligibleCategory = (catId: string) => {
    if (disabled) return;
    const next = eligibleCategoryIds.includes(catId)
      ? eligibleCategoryIds.filter((id) => id !== catId)
      : [...eligibleCategoryIds, catId];
    onChange({ eligibleServiceCategoryIds: next });
  };

  const toggleEligibleService = (srvId: string) => {
    if (disabled) return;
    const next = eligibleServiceIds.includes(srvId)
      ? eligibleServiceIds.filter((id) => id !== srvId)
      : [...eligibleServiceIds, srvId];
    onChange({ eligibleServiceIds: next });
  };

  // Handlers for Exclusions
  const toggleExcludedCategory = (catId: string) => {
    if (disabled) return;
    const next = excludedCategoryIds.includes(catId)
      ? excludedCategoryIds.filter((id) => id !== catId)
      : [...excludedCategoryIds, catId];
    onChange({ excludedServiceCategoryIds: next });
  };

  const toggleExcludedService = (srvId: string) => {
    if (disabled) return;
    const next = excludedServiceIds.includes(srvId)
      ? excludedServiceIds.filter((id) => id !== srvId)
      : [...excludedServiceIds, srvId];
    onChange({ excludedServiceIds: next });
  };

  const isAllServicesEligible =
    eligibleCategoryIds.length === 0 && eligibleServiceIds.length === 0;

  return (
    <div className="space-y-3">
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("inclusions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === "inclusions"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Eligible Services & Categories
            {(eligibleCategoryIds.length > 0 || eligibleServiceIds.length > 0) && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1 ml-1 bg-background/30 text-current">
                {eligibleCategoryIds.length + eligibleServiceIds.length}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("exclusions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === "exclusions"
                ? "bg-destructive text-destructive-foreground shadow-2xs"
                : "bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Explicit Exclusions
            {(excludedCategoryIds.length > 0 || excludedServiceIds.length > 0) && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1 ml-1 bg-background/30 text-current">
                {excludedCategoryIds.length + excludedServiceIds.length}
              </Badge>
            )}
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          {isAllServicesEligible
            ? "Applies to All Services"
            : "Specific Services/Categories Configured"}
        </span>
      </div>

      {/* TAB 1: INCLUSIONS */}
      {activeSubTab === "inclusions" && (
        <div className="space-y-4">
          <div className="p-2.5 rounded-lg border bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div>
              <span className="font-semibold block">
                {isAllServicesEligible
                  ? "Universal Service Eligibility Active"
                  : "Targeted Inclusions Active"}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {isAllServicesEligible
                  ? "All catalogue services qualify for discount (unless explicitly excluded in Exclusions tab)."
                  : "Only the categories or services checked below will receive the membership discount."}
              </span>
            </div>
            {!isAllServicesEligible && (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    eligibleServiceCategoryIds: [],
                    eligibleServiceIds: [],
                  })
                }
                className="text-[11px] underline font-medium hover:text-emerald-700 cursor-pointer"
              >
                Reset to All Services
              </button>
            )}
          </div>

          {/* Categories Inclusions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" /> Eligible Service Categories
              </label>
              <span className="text-[10px] text-muted-foreground">
                {eligibleCategoryIds.length} selected
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="pl-8 text-xs h-7.5"
                disabled={disabled}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-muted/20 border rounded-md">
              {filteredCategories.map((cat) => {
                const catId = cat.id || (cat as { _id?: string })._id || "";
                if (!catId) return null;
                const isChecked = eligibleCategoryIds.includes(catId);
                return (
                  <button
                    key={catId}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleEligibleCategory(catId)}
                    className={`flex items-center justify-between p-1.5 rounded border text-xs text-left transition-colors cursor-pointer ${
                      isChecked
                        ? "bg-primary/10 border-primary font-medium text-foreground"
                        : "bg-card hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isChecked && <Check className="w-3 h-3 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Services Inclusions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Specific Service Inclusions
              </label>
              <span className="text-[10px] text-muted-foreground">
                {eligibleServiceIds.length} selected
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search specific services..."
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                className="pl-8 text-xs h-7.5"
                disabled={disabled}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-muted/20 border rounded-md">
              {filteredServices.map((srv) => {
                const srvId = srv.id || (srv as { _id?: string })._id || "";
                if (!srvId) return null;
                const isChecked = eligibleServiceIds.includes(srvId);
                return (
                  <button
                    key={srvId}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleEligibleService(srvId)}
                    className={`flex items-center justify-between p-1.5 rounded border text-[11px] text-left transition-colors cursor-pointer ${
                      isChecked
                        ? "bg-primary/10 border-primary font-medium text-foreground"
                        : "bg-card hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="truncate">{srv.name}</span>
                    {isChecked && <Check className="w-3 h-3 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXCLUSIONS */}
      {activeSubTab === "exclusions" && (
        <div className="space-y-4">
          <div className="p-2.5 rounded-lg border bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs">
            <span className="font-semibold block">Exclusion Rules Win Over Inclusions</span>
            <span className="text-[10px] text-muted-foreground block">
              Any category or service selected below will be strictly exempted from membership discounts, even if included in the plan or category broad rules.
            </span>
          </div>

          {/* Category Exclusions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-destructive" /> Excluded Service Categories
              </label>
              <span className="text-[10px] text-muted-foreground">
                {excludedCategoryIds.length} excluded
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-muted/20 border rounded-md">
              {serviceCategories.map((cat) => {
                const catId = cat.id || (cat as { _id?: string })._id || "";
                if (!catId) return null;
                const isExcluded = excludedCategoryIds.includes(catId);
                return (
                  <button
                    key={catId}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleExcludedCategory(catId)}
                    className={`flex items-center justify-between p-1.5 rounded border text-xs text-left transition-colors cursor-pointer ${
                      isExcluded
                        ? "bg-destructive/15 border-destructive font-medium text-destructive"
                        : "bg-card hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isExcluded && <X className="w-3 h-3 text-destructive shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Services Exclusions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-destructive" /> Excluded Specific Services
              </label>
              <span className="text-[10px] text-muted-foreground">
                {excludedServiceIds.length} excluded
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-muted/20 border rounded-md">
              {allServices.map((srv) => {
                const srvId = srv.id || (srv as { _id?: string })._id || "";
                if (!srvId) return null;
                const isExcluded = excludedServiceIds.includes(srvId);
                return (
                  <button
                    key={srvId}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleExcludedService(srvId)}
                    className={`flex items-center justify-between p-1.5 rounded border text-[11px] text-left transition-colors cursor-pointer ${
                      isExcluded
                        ? "bg-destructive/15 border-destructive font-medium text-destructive"
                        : "bg-card hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="truncate">{srv.name}</span>
                    {isExcluded && <X className="w-3 h-3 text-destructive shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
