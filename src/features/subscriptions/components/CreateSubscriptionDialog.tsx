"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  useForm,
  useWatch,
  Controller,
  useFieldArray,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addMonths } from "date-fns";
import {
  Plus,
  Trash2,
  Building2,
  AlertCircle,
  Loader2,
  Sparkles,
  Crown,
  Calendar,
  Layers,
  ShieldCheck,
  TrendingUp,
  Check,
  Search,
  ChevronDown,
  X,
  Clock,
  ChevronRight,
  PackageCheck,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomerSelector } from "@/features/customers/components/CustomerSelector";
import { useServices } from "@/features/services/hooks/services/useServices";
import { useServiceCategories } from "@/features/services/hooks/categories/useServiceCategories";
import { useBranchContext } from "@/hooks/useBranchContext";
import {
  createSubscriptionSchema,
  type CreateSubscriptionFormValues,
} from "../schemas/subscription.schema";
import type { Service } from "@/features/services/types/service.types";
import type { ServiceCategory } from "@/features/services/types/category.types";
import { useSubscriptionPlans } from "../hooks/useSubscriptionPlans";
import type { SubscriptionPlan } from "../types/plan.types";

interface CreateSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateSubscriptionFormValues) => Promise<void>;
  isLoading: boolean;
  initialCustomerId?: string;
  initialPlan?: SubscriptionPlan | null;
  branchId?: string;
}

export function CreateSubscriptionDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialCustomerId,
  initialPlan,
  branchId: propBranchId,
}: CreateSubscriptionDialogProps) {
  const { availableBranches, currentBranch, currentBranchId, isAllBranchesSelected } =
    useBranchContext();

  // Derive active selling branch
  const effectiveBranchId =
    propBranchId && propBranchId !== "all"
      ? propBranchId
      : currentBranchId && currentBranchId !== "all" && !isAllBranchesSelected
      ? currentBranchId
      : null;

  const effectiveBranch =
    availableBranches.find((b) => b.id === effectiveBranchId) ||
    (currentBranch?.id === effectiveBranchId ? currentBranch : null);

  const effectiveBranchName =
    effectiveBranch?.name ||
    (effectiveBranchId ? `Branch #${effectiveBranchId.slice(-4)}` : null);

  const [branchValidationError, setBranchValidationError] = useState<string | null>(null);

  // --- TEMPLATE SELECTOR STATE ---
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const templateSelectorRef = useRef<HTMLDivElement>(null);

  const [selectedPlanTemplateId, setSelectedPlanTemplateId] = useState<string>(
    initialPlan?.id || (initialPlan as unknown as { _id?: string })?._id || ""
  );

  // --- SERVICE SELECTION SEARCH & CATEGORY FILTER STATE ---
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        templateSelectorRef.current &&
        !templateSelectorRef.current.contains(event.target as Node)
      ) {
        setIsTemplateSelectorOpen(false);
      }
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

  // Fetch plan templates
  const { data: plansData } = useSubscriptionPlans({
    isActive: true,
  });
  const planTemplates: SubscriptionPlan[] = plansData?.data || [];

  // Fetch categories
  const { data: categoriesData } = useServiceCategories();
  const categories: ServiceCategory[] = categoriesData?.data || [];

  // Fetch organization-global services
  const { data: servicesData, isLoading: isLoadingServices } = useServices({
    limit: "all",
  });
  const allServices: Service[] = servicesData?.data || [];
  const activeServices = allServices.filter((s) => s.isActive);

  // Lookup map for fast O(1) service info & retail price resolution
  const serviceMap = useMemo(() => {
    const map = new Map<string, Service>();
    allServices.forEach((s) => {
      map.set(s.id, s);
      const withUnderscore = s as unknown as { _id?: string };
      if (withUnderscore._id) {
        map.set(withUnderscore._id, s);
      }
    });
    return map;
  }, [allServices]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const sixMonthsLaterStr = format(addMonths(new Date(), 6), "yyyy-MM-dd");

  const resolveServiceId = (raw: unknown, idx: number): string => {
    if (typeof raw === "string" && raw.trim() !== "") return raw;
    if (typeof raw === "object" && raw !== null) {
      const obj = raw as { _id?: string; id?: string };
      return obj._id || obj.id || `unknown-${idx}`;
    }
    return `unknown-${idx}`;
  };

  const initialPlanId =
    initialPlan?.id || (initialPlan as unknown as { _id?: string })?._id || "";
  const defaultPrice = initialPlan?.suggestedPrice ?? 0;
  const defaultEndDate = initialPlan?.validityMonths
    ? format(addMonths(new Date(), initialPlan.validityMonths), "yyyy-MM-dd")
    : sixMonthsLaterStr;
  const defaultEntitlements = initialPlan?.entitlements
    ? initialPlan.entitlements.map((e, idx) => ({
        serviceId: resolveServiceId(e.serviceId, idx),
        quantity: e.quantity,
      }))
    : [];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<CreateSubscriptionFormValues>({
    resolver: zodResolver(
      createSubscriptionSchema
    ) as unknown as Resolver<CreateSubscriptionFormValues>,
    defaultValues: {
      customerId: initialCustomerId || "",
      planId: initialPlanId || undefined,
      price: defaultPrice,
      entitlements: defaultEntitlements,
      permittedBranchIds: [],
      startDate: todayStr,
      endDate: defaultEndDate,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entitlements",
  });

  // Sync form values on modal open
  React.useEffect(() => {
    if (isOpen) {
      const pId =
        initialPlan?.id || (initialPlan as unknown as { _id?: string })?._id || "";
      setSelectedPlanTemplateId(pId);
      setTemplateSearchQuery("");
      setIsTemplateSelectorOpen(false);
      setServiceSearchQuery("");
      setSelectedCategoryId("all");
      setIsServiceDropdownOpen(false);

      reset({
        customerId: initialCustomerId || "",
        planId: pId || undefined,
        price: initialPlan?.suggestedPrice ?? 0,
        entitlements: initialPlan?.entitlements
          ? initialPlan.entitlements.map((e, idx) => ({
              serviceId: resolveServiceId(e.serviceId, idx),
              quantity: e.quantity,
            }))
          : [],
        permittedBranchIds: [],
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: initialPlan?.validityMonths
          ? format(addMonths(new Date(), initialPlan.validityMonths), "yyyy-MM-dd")
          : format(addMonths(new Date(), 6), "yyyy-MM-dd"),
        notes: "",
      });
    }
  }, [isOpen, initialCustomerId, initialPlan, reset]);

  // Reactive form watchers
  const watchedPrice = useWatch({ control, name: "price" }) ?? 0;
  const watchedEntitlements = useWatch({ control, name: "entitlements" }) || [];
  const watchedPermittedBranches =
    useWatch({ control, name: "permittedBranchIds" }) || [];

  // Active Template Object
  const currentSelectedTemplate = useMemo(() => {
    if (!selectedPlanTemplateId) return null;
    return (
      planTemplates.find(
        (t) =>
          t.id === selectedPlanTemplateId ||
          (t as unknown as { _id?: string })._id === selectedPlanTemplateId
      ) || null
    );
  }, [planTemplates, selectedPlanTemplateId]);

  // Filtered Templates for Scalable Large Catalogs
  const filteredTemplates = useMemo(() => {
    if (!templateSearchQuery.trim()) return planTemplates;
    const q = templateSearchQuery.toLowerCase();
    return planTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [planTemplates, templateSearchQuery]);

  // Filtered Services for Search & Category Selection
  const filteredServices = useMemo(() => {
    const selectedIds = new Set(watchedEntitlements.map((e) => e.serviceId));

    return activeServices.filter((service) => {
      // 1. Exclude already added services
      if (selectedIds.has(service.id)) return false;

      // 2. Category Filter
      if (selectedCategoryId !== "all") {
        const rawCatId =
          typeof service.categoryId === "object" && service.categoryId !== null
            ? service.categoryId._id || (service.categoryId as unknown as { id?: string }).id
            : service.categoryId;
        if (rawCatId !== selectedCategoryId) return false;
      }

      // 3. Search query filter
      if (serviceSearchQuery.trim()) {
        const q = serviceSearchQuery.toLowerCase();
        const matchesName = service.name.toLowerCase().includes(q);
        const matchesCode = service.code?.toLowerCase().includes(q);
        return matchesName || matchesCode;
      }

      return true;
    });
  }, [activeServices, watchedEntitlements, selectedCategoryId, serviceSearchQuery]);

  // Compute total retail value, total session count, and customer savings
  const financialSummary = useMemo(() => {
    let totalRetailValue = 0;
    let totalSessions = 0;

    watchedEntitlements.forEach((ent) => {
      const svc = serviceMap.get(ent.serviceId);
      const retailPrice = svc?.basePrice ?? svc?.pricing?.basePrice ?? 0;
      const qty = typeof ent.quantity === "number" && !isNaN(ent.quantity) ? ent.quantity : 0;
      totalRetailValue += retailPrice * qty;
      totalSessions += qty;
    });

    const numericSalePrice = typeof watchedPrice === "number" && !isNaN(watchedPrice) ? watchedPrice : 0;
    const customerSavings = Math.max(0, totalRetailValue - numericSalePrice);
    const savingsPercent =
      totalRetailValue > 0 && customerSavings > 0
        ? Math.round((customerSavings / totalRetailValue) * 100)
        : 0;

    return {
      totalRetailValue,
      totalSessions,
      numericSalePrice,
      customerSavings,
      savingsPercent,
    };
  }, [watchedEntitlements, watchedPrice, serviceMap]);

  const handleSelectService = (serviceId: string) => {
    append({
      serviceId,
      quantity: 1,
    });
    setServiceSearchQuery("");
    setIsServiceDropdownOpen(false);
  };

  const handleApplyPlanTemplate = (planId: string) => {
    setSelectedPlanTemplateId(planId);
    setIsTemplateSelectorOpen(false);
    setTemplateSearchQuery("");

    if (!planId) {
      setValue("planId", undefined, { shouldValidate: true });
      return;
    }
    const match = planTemplates.find(
      (p: SubscriptionPlan) =>
        p.id === planId || (p as unknown as { _id?: string })._id === planId
    );
    if (!match) return;

    setValue("planId", planId, { shouldValidate: true });
    setValue("price", match.suggestedPrice, { shouldValidate: true });

    const end = format(
      addMonths(new Date(), match.validityMonths || 6),
      "yyyy-MM-dd"
    );
    setValue("endDate", end, { shouldValidate: true });

    setValue(
      "entitlements",
      match.entitlements.map((e, idx) => ({
        serviceId: resolveServiceId(e.serviceId, idx),
        quantity: e.quantity,
      })),
      { shouldValidate: true }
    );
  };

  const toggleBranch = (branchId: string) => {
    const current = watchedPermittedBranches;
    if (current.includes(branchId)) {
      setValue(
        "permittedBranchIds",
        current.filter((id) => id !== branchId),
        { shouldValidate: true }
      );
    } else {
      setValue("permittedBranchIds", [...current, branchId], {
        shouldValidate: true,
      });
    }
  };

  const handleFormSubmit = async (data: CreateSubscriptionFormValues) => {
    setBranchValidationError(null);
    if (!effectiveBranchId) {
      setBranchValidationError(
        "Please select a specific selling branch before creating a subscription. Subscription sale invoices cannot be issued under 'All Branches' or without an active branch selection."
      );
      return;
    }
    await onSubmit(data);
    reset();
  };

  if (!isOpen) return null;

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6 pt-1 text-foreground"
    >
      {/* 1. HERO CONTEXT BANNER & SELLING BRANCH STATUS */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Layers className="h-4 w-4" />
              </span>
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                Sell Customer Subscription
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Issue prepaid service entitlements, configure package validity, and generate a sale invoice.
            </p>
          </div>

          {/* Branch Pill */}
          {!effectiveBranchId ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold shrink-0">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Active Selling Branch Required</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background/80 backdrop-blur-sm border border-border shadow-2xs shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
              <div className="text-left text-xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Selling Branch:
                </span>
                <span className="font-semibold text-foreground">
                  {effectiveBranchName}
                </span>
              </div>
            </div>
          )}
        </div>

        {!effectiveBranchId && (
          <div className="mt-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Subscription creation and sale invoice generation require an active branch selection. Please select an active branch from the top header switcher before proceeding.
            </span>
          </div>
        )}
      </div>

      {branchValidationError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{branchValidationError}</span>
        </div>
      )}

      {/* 2. PRODUCTION-GRADE SEARCHABLE TEMPLATE SELECTOR WITH FULL DETAIL PREVIEW */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Package Template</span>
          </label>
          <span className="text-[11px] text-muted-foreground">
            {planTemplates.length} configured package{planTemplates.length === 1 ? "" : "s"}
          </span>
        </div>

        <div ref={templateSelectorRef} className="relative">
          {/* Main Selected Template Display / Dropdown Trigger */}
          <div
            onClick={() => setIsTemplateSelectorOpen((prev) => !prev)}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-input bg-background hover:border-primary/50 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary/15 transition-colors">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-foreground">
                    {currentSelectedTemplate
                      ? currentSelectedTemplate.name
                      : "Custom Package (From Scratch)"}
                  </span>
                  {currentSelectedTemplate ? (
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                      Standardized Plan
                    </span>
                  ) : (
                    <span className="text-[10px] bg-muted text-muted-foreground font-semibold px-2 py-0.5 rounded-full">
                      Bespoke Package
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {currentSelectedTemplate
                    ? currentSelectedTemplate.description ||
                      `Suggested ₹${currentSelectedTemplate.suggestedPrice?.toLocaleString(
                        "en-IN"
                      )} • Valid for ${
                        currentSelectedTemplate.validityMonths || 6
                      } months • ${
                        currentSelectedTemplate.entitlements?.length || 0
                      } bundled services`
                    : "No preset template selected. Freely pick services and set custom pricing."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
              {currentSelectedTemplate && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Suggested Price
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-foreground">
                    ₹{currentSelectedTemplate.suggestedPrice?.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 text-foreground text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <span>Browse Plans</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isTemplateSelectorOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Interactive Popover Modal/Panel with Complete Details & Filter */}
          {isTemplateSelectorOpen && (
            <div className="absolute z-40 left-0 right-0 mt-2 p-3.5 bg-popover text-popover-foreground rounded-2xl border border-border shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 max-h-[420px] flex flex-col">
              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  placeholder="Search package templates by name or description..."
                  className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {templateSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTemplateSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Scrollable Templates List (Full details without awkward truncation) */}
              <div className="overflow-y-auto space-y-2 pr-1 flex-1 scrollbar-thin">
                {/* Custom / From Scratch Item */}
                <button
                  type="button"
                  onClick={() => handleApplyPlanTemplate("")}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    !selectedPlanTemplateId
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/70 bg-background hover:bg-muted/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-foreground block">
                        Custom Package (Start from scratch)
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Freely configure custom service entitlements, rates, and validity periods.
                      </p>
                    </div>
                  </div>
                  {!selectedPlanTemplateId && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>

                {/* Template Items */}
                {filteredTemplates.map((template) => {
                  const isSelected =
                    selectedPlanTemplateId === template.id ||
                    selectedPlanTemplateId ===
                      (template as unknown as { _id?: string })._id;

                  // Resolve entitlement service names for clear transparency
                  const serviceNamesSummary = template.entitlements
                    ?.map((ent, idx) => {
                      const id = resolveServiceId(ent.serviceId, idx);
                      const svc = serviceMap.get(id);
                      return `${ent.quantity}x ${svc?.name || ent.serviceName || "Service"}`;
                    })
                    .join(", ");

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleApplyPlanTemplate(template.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                          : "border-border/70 bg-background hover:bg-muted/40 hover:border-border"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-foreground">
                            {template.name}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Check className="h-3 w-3 stroke-3" /> Active
                            </span>
                          )}
                        </div>

                        {template.description && (
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            {template.description}
                          </p>
                        )}

                        {/* Complete Services List Preview */}
                        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground pt-0.5">
                          <Layers className="h-3.5 w-3.5 text-primary/70 shrink-0 mt-0.5" />
                          <span className="leading-snug">
                            <strong>Includes:</strong>{" "}
                            {serviceNamesSummary || `${template.entitlements?.length || 0} services`}
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <span className="text-xs sm:text-sm font-extrabold text-foreground">
                          ₹{template.suggestedPrice?.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                          {template.validityMonths || 6} months validity
                        </span>
                      </div>
                    </button>
                  );
                })}

                {filteredTemplates.length === 0 && (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                    No templates matching &ldquo;{templateSearchQuery}&rdquo;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. CUSTOMER SELECTION */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Customer <span className="text-destructive">*</span></span>
          <span className="text-[10px] font-normal text-muted-foreground lowercase">
            Search by name or mobile number
          </span>
        </label>
        <Controller
          name="customerId"
          control={control}
          render={({ field }) => (
            <CustomerSelector
              value={field.value}
              onChange={(id) => field.onChange(id)}
              branchId={effectiveBranchId || undefined}
              error={errors.customerId?.message}
              disabled={isLoading}
            />
          )}
        />
      </div>

      {/* 4. SERVICE ENTITLEMENTS BUILDER WITH ADVANCED DISCOVERY & SELECTION */}
      <div className="space-y-3 rounded-2xl border border-border/90 bg-muted/20 p-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Package Service Entitlements <span className="text-destructive">*</span>
            </h4>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
            {financialSummary.totalSessions} Total Sessions ({fields.length} {fields.length === 1 ? "Service" : "Services"})
          </span>
        </div>

        {/* Searchable & Filterable Service Picker Dropdown */}
        <div ref={serviceDropdownRef} className="relative">
          <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
            Add service to package:
          </label>

          {/* Trigger Input */}
          <div
            onClick={() => setIsServiceDropdownOpen((prev) => !prev)}
            className="flex items-center justify-between w-full h-10 px-3.5 rounded-xl border border-input bg-background cursor-pointer hover:border-primary/50 transition-colors shadow-2xs text-xs"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4 text-primary/70 shrink-0" />
              <span>
                {isServiceDropdownOpen
                  ? "Type or select below..."
                  : "Search & add services by category..."}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {activeServices.length} available
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  isServiceDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {/* Popover / Dropdown Menu with Category Filter & Instant Search */}
          {isServiceDropdownOpen && (
            <div className="absolute z-30 left-0 right-0 mt-2 p-3 bg-popover text-popover-foreground rounded-2xl border border-border shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
              {/* Search Bar Inside Dropdown */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  placeholder="Filter services by name or code..."
                  className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {serviceSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setServiceSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Service Items List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {filteredServices.length > 0 ? (
                  filteredServices.map((service) => {
                    const retail =
                      service.basePrice ?? service.pricing?.basePrice ?? 0;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleSelectService(service.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-colors text-left cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                              {service.name}
                            </span>
                            {service.code && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {service.code}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {service.duration} mins
                            </span>
                            {service.gender && (
                              <span className="capitalize">• {service.gender}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-xs text-foreground">
                            ₹{retail.toLocaleString("en-IN")}
                          </span>
                          <span className="h-6 w-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    {activeServices.length === 0
                      ? "No services configured in system."
                      : "No services match your search or all have been added."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Configured Entitlements List */}
        {fields.length > 0 ? (
          <div className="space-y-2 pt-1">
            {fields.map((fieldItem, index) => {
              const safeServiceId = resolveServiceId(fieldItem.serviceId, index);
              const matchedService = serviceMap.get(safeServiceId);
              const unitRetail =
                matchedService?.basePrice ??
                matchedService?.pricing?.basePrice ??
                0;
              const currentQty =
                watchedEntitlements[index]?.quantity ?? fieldItem.quantity ?? 1;
              const lineTotal = unitRetail * (currentQty || 0);

              return (
                <div
                  key={fieldItem.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/80 shadow-2xs hover:border-primary/40 transition-colors gap-3"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground truncate">
                        {matchedService?.name || safeServiceId}
                      </span>
                      {matchedService?.code && (
                        <span className="text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                          {matchedService.code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span>Retail: ₹{unitRetail} / session</span>
                      {unitRetail > 0 && currentQty > 1 && (
                        <span className="text-[10px] font-semibold text-primary">
                          (₹{lineTotal.toLocaleString("en-IN")} total value)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor={`entitlement-qty-${index}`}
                        className="text-[10px] uppercase font-bold text-muted-foreground"
                      >
                        Sessions:
                      </label>
                      <Input
                        id={`entitlement-qty-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        disabled={isLoading}
                        className="h-8 w-20 text-xs px-2 text-center font-extrabold text-primary border-primary/30"
                        {...register(`entitlements.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg cursor-pointer transition-colors"
                      title="Remove Entitlement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-border/80 bg-background/50 text-center">
            <p className="text-xs text-muted-foreground">
              No service entitlements added yet. Use the search picker above to include services in this package.
            </p>
          </div>
        )}

        {errors.entitlements && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {errors.entitlements.message}
          </p>
        )}
      </div>

      {/* 5. PRICING & VALUE COMPARISON CARD WITH FIXED BADGE ALIGNMENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Agreed Sale Price Input */}
        <div className="space-y-1.5 p-4 rounded-2xl border border-border/80 bg-background shadow-2xs">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Customer Sale Price (₹) <span className="text-destructive">*</span></span>
            <span className="text-[10px] font-normal text-muted-foreground">
              agreed billable amount
            </span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
              ₹
            </span>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              disabled={isLoading}
              {...register("price", { valueAsNumber: true })}
              className="h-10 pl-8 text-sm font-bold text-foreground rounded-xl"
            />
          </div>
          {errors.price && (
            <p className="text-[11px] text-destructive">{errors.price.message}</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            This amount will be billed to the customer upon invoice creation.
          </p>
        </div>

        {/* Customer Value Breakdown Card (Aligned Properly with ml-auto) */}
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              <span>Customer Value Breakdown</span>
            </span>
            {financialSummary.savingsPercent > 0 && (
              <span className="ml-auto inline-flex items-center text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-2xs">
                {financialSummary.savingsPercent}% OFF
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 my-2.5 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                Total Retail Worth:
              </span>
              <span className="font-bold text-foreground text-sm">
                ₹{financialSummary.totalRetailValue.toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                Customer Saves:
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                ₹{financialSummary.customerSavings.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-emerald-500/10">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Prepaid credits valid across designated branches</span>
          </div>
        </div>
      </div>

      {/* 6. PERMITTED BRANCHES (MULTI-BRANCH AVAILABILITY) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>Permitted Redemption Branches</span>
          </label>
          <span className="text-[11px] text-muted-foreground font-medium">
            {watchedPermittedBranches.length === 0
              ? "All Branches (Default)"
              : `${watchedPermittedBranches.length} branch(es) allowed`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-border/80 bg-background">
          <button
            type="button"
            onClick={() =>
              setValue("permittedBranchIds", [], { shouldValidate: true })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              watchedPermittedBranches.length === 0
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" /> All Branches
          </button>

          {availableBranches.map((branch) => {
            const isSelected = watchedPermittedBranches.includes(branch.id);
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => toggleBranch(branch.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary/20 text-primary border border-primary/40 font-bold shadow-2xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {branch.name}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Leave on &ldquo;All Branches&rdquo; to allow customer redemptions anywhere across the franchise.
        </p>
      </div>

      {/* 7. VALIDITY SCHEDULE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl border border-border/80 bg-background shadow-2xs">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Start Date <span className="text-destructive">*</span></span>
          </label>
          <Input
            type="date"
            disabled={isLoading}
            {...register("startDate")}
            className="h-9 text-xs rounded-xl"
          />
          {errors.startDate && (
            <p className="text-[11px] text-destructive">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>End Date <span className="text-destructive">*</span></span>
          </label>
          <Input
            type="date"
            disabled={isLoading}
            {...register("endDate")}
            className="h-9 text-xs rounded-xl"
          />
          {errors.endDate && (
            <p className="text-[11px] text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      {/* 8. NOTES & TERMS */}
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Customer Notes & Agreement Terms (Optional)
        </label>
        <Textarea
          placeholder="Special terms, customized exceptions, or customer preferences..."
          rows={2}
          disabled={isLoading}
          {...register("notes")}
          className="text-xs resize-none rounded-xl"
        />
      </div>

      {/* 9. MODAL ACTIONS FOOTER */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground hidden sm:block">
          {fields.length > 0 && financialSummary.numericSalePrice > 0 ? (
            <span>
              Billable: <strong className="text-foreground">₹{financialSummary.numericSalePrice.toLocaleString("en-IN")}</strong>
            </span>
          ) : (
            <span>Configure subscription details to issue package</span>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 px-4 text-xs cursor-pointer rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !effectiveBranchId}
            className="h-10 px-5 text-xs cursor-pointer gap-2 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm hover:opacity-95"
            title={
              !effectiveBranchId
                ? "Select an active branch to sell subscriptions"
                : undefined
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Layers className="h-4 w-4" />
            )}
            Sell Subscription
          </Button>
        </div>
      </div>
    </form>
  );
}
