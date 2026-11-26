"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Minus,
  Trash2,
  Layers,
  Loader2,
  Search,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useServices } from "@/features/services/hooks/services/useServices";
import { useServiceCategories } from "@/features/services/hooks/categories/useServiceCategories";
import {
  createSubscriptionPlanSchema,
  type CreateSubscriptionPlanFormValues,
} from "../schemas/plan.schema";
import type { SubscriptionPlan } from "../types/plan.types";
import type { Service } from "@/features/services/types/service.types";
import type { ServiceCategory } from "@/features/services/types/category.types";

interface PlanFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateSubscriptionPlanFormValues) => Promise<void>;
  isLoading: boolean;
  initialPlan?: SubscriptionPlan | null;
}

export function PlanFormDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialPlan,
}: PlanFormDialogProps) {
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(event.target as Node)
      ) {
        setIsServiceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const { data: categoriesData } = useServiceCategories();
  const categories: ServiceCategory[] = categoriesData?.data || [];

  const { data: servicesData, isLoading: isLoadingServices } = useServices({
    limit: "all",
  });
  const allServices: Service[] = useMemo(
    () => servicesData?.data || [],
    [servicesData?.data],
  );
  const activeServices = useMemo(
    () => allServices.filter((s) => s.isActive),
    [allServices],
  );

  const resolveInitialServiceId = (serviceId: unknown): string => {
    if (typeof serviceId === "string") return serviceId;
    if (serviceId && typeof serviceId === "object") {
      const obj = serviceId as { _id?: string; id?: string };
      return obj._id || obj.id || "";
    }
    return "";
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateSubscriptionPlanFormValues>({
    resolver: zodResolver(
      createSubscriptionPlanSchema,
    ) as unknown as Resolver<CreateSubscriptionPlanFormValues>,
    defaultValues: {
      name: initialPlan?.name || "",
      description: initialPlan?.description || "",
      suggestedPrice: initialPlan?.suggestedPrice || 0,
      validityMonths: initialPlan?.validityMonths || 6,
      entitlements:
        initialPlan?.entitlements?.map((e) => ({
          serviceId: resolveInitialServiceId(e.serviceId),
          quantity: e.quantity,
        })) || [],
      isActive: initialPlan?.isActive ?? true,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "entitlements",
  });

  // Store previous plan ID to reset selection state during render when plan changes
  const [prevPlanId, setPrevPlanId] = useState<string | null | undefined>(
    initialPlan?.id,
  );

  if (prevPlanId !== initialPlan?.id) {
    setPrevPlanId(initialPlan?.id);
    setServiceSearchQuery("");
    setSelectedCategoryId("all");
    setIsServiceDropdownOpen(false);
  }

  // Keep form in sync when editing a different plan or reopening
  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: initialPlan?.name || "",
        description: initialPlan?.description || "",
        suggestedPrice: initialPlan?.suggestedPrice || 0,
        validityMonths: initialPlan?.validityMonths || 6,
        entitlements:
          initialPlan?.entitlements?.map((e) => ({
            serviceId: resolveInitialServiceId(e.serviceId),
            quantity: e.quantity,
          })) || [],
        isActive: initialPlan?.isActive ?? true,
      });
    }
  }, [isOpen, initialPlan, reset]);

  const categoryCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    activeServices.forEach((service) => {
      const rawCatId =
        typeof service.categoryId === "object" && service.categoryId !== null
          ? service.categoryId._id ||
            (service.categoryId as unknown as { id?: string }).id
          : service.categoryId;
      if (rawCatId) {
        counts.set(rawCatId, (counts.get(rawCatId) || 0) + 1);
      }
    });
    return counts;
  }, [activeServices]);

  const filteredServices = useMemo(() => {
    const selectedIds = new Set(fields.map((f) => f.serviceId));

    return activeServices.filter((service) => {
      if (selectedIds.has(service.id)) return false;

      if (selectedCategoryId !== "all") {
        const rawCatId =
          typeof service.categoryId === "object" && service.categoryId !== null
            ? service.categoryId._id ||
              (service.categoryId as unknown as { id?: string }).id
            : service.categoryId;
        if (rawCatId !== selectedCategoryId) return false;
      }

      if (serviceSearchQuery.trim()) {
        const q = serviceSearchQuery.toLowerCase();
        const matchesName = service.name.toLowerCase().includes(q);
        const matchesCode = service.code?.toLowerCase().includes(q);
        return matchesName || matchesCode;
      }

      return true;
    });
  }, [activeServices, fields, selectedCategoryId, serviceSearchQuery]);

  if (!isOpen) return null;

  const handleSelectService = (serviceId: string) => {
    if (fields.some((e) => e.serviceId === serviceId)) return;
    append({
      serviceId,
      quantity: 1,
    });
    setServiceSearchQuery("");
    setIsServiceDropdownOpen(false);
  };

  const handleFormSubmit = async (data: CreateSubscriptionPlanFormValues) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Plan Name <span className="text-destructive">*</span>
          </label>
          <Input
            {...register("name")}
            placeholder="e.g. Grooming Deluxe 6-Month Pass"
            className="h-9 text-xs"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-[11px] text-destructive mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Description (Optional)
          </label>
          <Textarea
            {...register("description")}
            placeholder="Describe what services and benefits are packaged into this plan..."
            rows={2}
            className="text-xs"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Suggested Retail Price (₹){" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register("suggestedPrice", { valueAsNumber: true })}
              placeholder="0.00"
              className="h-9 text-xs"
              disabled={isLoading}
            />
            {errors.suggestedPrice && (
              <p className="text-[11px] text-destructive mt-1">
                {errors.suggestedPrice.message}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Can be overridden during customer checkout
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Validity (Months) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min="1"
              max="120"
              {...register("validityMonths", { valueAsNumber: true })}
              placeholder="6"
              className="h-9 text-xs"
              disabled={isLoading}
            />
            {errors.validityMonths && (
              <p className="text-[11px] text-destructive mt-1">
                {errors.validityMonths.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Entitlements Builder */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground block">
            Included Services & Session Quotas{" "}
            <span className="text-destructive">*</span>
          </label>
          <span className="text-[11px] text-muted-foreground">
            {fields.length} service(s) configured
          </span>
        </div>

        {/* Searchable & Filterable Service Picker Dropdown */}
        <div ref={serviceDropdownRef} className="relative">
          <div
            onClick={() => {
              if (!isLoading && !isLoadingServices) {
                setIsServiceDropdownOpen((prev) => !prev);
              }
            }}
            className={`flex items-center justify-between w-full h-10 px-3 rounded-lg border border-input bg-background transition-colors text-xs ${
              isLoading || isLoadingServices
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              <span>
                {isLoadingServices
                  ? "Loading services..."
                  : isServiceDropdownOpen
                    ? "Type or select below..."
                    : "Search & add services by category..."}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                {activeServices.length} available
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                  isServiceDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {isServiceDropdownOpen && (
            <div className="absolute z-30 left-0 right-0 mt-1.5 p-3 bg-popover text-popover-foreground rounded-xl border border-border shadow-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  placeholder="Filter services by name or code..."
                  className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {serviceSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setServiceSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId("all")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    selectedCategoryId === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({activeServices.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      selectedCategoryId === cat.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.name} ({categoryCountMap.get(cat.id) || 0})
                  </button>
                ))}
              </div>

              {/* Service Items List */}
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {filteredServices.length > 0 ? (
                  filteredServices.map((service) => {
                    const retail =
                      service.basePrice ?? service.pricing?.basePrice ?? 0;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleSelectService(service.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-colors text-left cursor-pointer group gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                              {service.name}
                            </span>
                            {service.code && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                {service.code}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                          ₹{retail}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No matching services found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current configured entitlements table */}
        {fields.length > 0 ? (
          <div className="border border-border rounded-md divide-y divide-border overflow-hidden bg-background">
            {fields.map((field, idx) => {
              const rawSrv = field.serviceId as unknown;
              const srvObj =
                typeof rawSrv === "object" && rawSrv !== null
                  ? (rawSrv as { _id?: string; id?: string; name?: string })
                  : undefined;
              const resolvedId =
                srvObj?._id ||
                srvObj?.id ||
                (typeof field.serviceId === "string" ? field.serviceId : "");

              const matchedService = allServices.find((s) => s.id === resolvedId);
              const displayName =
                matchedService?.name ||
                srvObj?.name ||
                (resolvedId ? `Service #${resolvedId.slice(-6)}` : `Service #${idx + 1}`);

              return (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-2 text-xs hover:bg-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground w-4 text-[10px]">
                      {idx + 1}.
                    </span>
                    <div>
                      <span className="font-semibold text-foreground">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2">
                        Catalog: ₹{matchedService?.pricing?.basePrice ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-input rounded-md bg-background overflow-hidden h-7">
                      <button
                        type="button"
                        onClick={() => {
                          const currentQty = Number(fields[idx].quantity) || 1;
                          if (currentQty > 1) {
                            update(idx, {
                              ...fields[idx],
                              quantity: currentQty - 1,
                            });
                          }
                        }}
                        disabled={isLoading || (fields[idx].quantity || 1) <= 1}
                        className="px-1.5 h-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Decrease quota"
                      >
                        <Minus className="h-3 w-3" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max="1000"
                        {...register(`entitlements.${idx}.quantity`, {
                          valueAsNumber: true,
                          min: 1,
                        })}
                        disabled={isLoading}
                        className="w-12 h-full text-center text-xs font-mono font-bold bg-transparent text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const currentQty = Number(fields[idx].quantity) || 1;
                          update(idx, {
                            ...fields[idx],
                            quantity: currentQty + 1,
                          });
                        }}
                        disabled={isLoading}
                        className="px-1.5 h-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Increase quota"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                      sessions
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(idx)}
                      disabled={isLoading}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 cursor-pointer ml-1"
                      title="Remove service"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 bg-muted/20 border border-dashed border-border rounded-md text-center text-xs text-muted-foreground">
            No service quotas configured yet. Add at least one service above.
          </div>
        )}

        {errors.entitlements && (
          <p className="text-[11px] text-destructive mt-1">
            {errors.entitlements.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="h-8 text-xs cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || fields.length === 0}
          className="h-8 text-xs gap-1.5 shadow-sm cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Layers className="h-3.5 w-3.5" />
              {initialPlan ? "Update Plan" : "Create Plan"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
