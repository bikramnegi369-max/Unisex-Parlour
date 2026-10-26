"use client";

import React, { useState } from "react";
import { useForm, useWatch, Controller, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addMonths } from "date-fns";
import { Plus, Trash2, Building2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomerSelector } from "@/features/customers/components/CustomerSelector";
import { useServices } from "@/features/services/hooks/services/useServices";
import { useBranchContext } from "@/hooks/useBranchContext";
import {
  createSubscriptionSchema,
  type CreateSubscriptionFormValues,
} from "../schemas/subscription.schema";
import type { Service } from "@/features/services/types/service.types";
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
  const { availableBranches, currentBranch, currentBranchId, isAllBranchesSelected } = useBranchContext();

  // Derive the active selling branch: prefer explicitly provided branchId (e.g. from appointment creation),
  // falling back to current branch selection if not "all".
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

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("1");
  const [serviceAddError, setServiceAddError] = useState<string | null>(null);
  const [branchValidationError, setBranchValidationError] = useState<string | null>(null);
  const [selectedPlanTemplateId, setSelectedPlanTemplateId] = useState<string>(
    initialPlan?.id || (initialPlan as unknown as { _id?: string })?._id || ""
  );

  // Fetch plan templates
  const { data: plansData } = useSubscriptionPlans({ isActive: true });
  const planTemplates: SubscriptionPlan[] = plansData?.data || [];

  // Fetch organization-global services
  const { data: servicesData, isLoading: isLoadingServices } = useServices({
    limit: "all",
  });
  const allServices: Service[] = servicesData?.data || [];
  const activeServices = allServices.filter((s) => s.isActive);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const sixMonthsLaterStr = format(addMonths(new Date(), 6), "yyyy-MM-dd");

  // The backend may populate `serviceId` in plan entitlements as a full service
  // object { _id, name, pricing, duration } instead of a plain string ID.
  // This helper always returns a safe string ID.
  const resolveServiceId = (raw: unknown, idx: number): string => {
    if (typeof raw === "string" && raw.trim() !== "") return raw;
    if (typeof raw === "object" && raw !== null) {
      const obj = raw as { _id?: string; id?: string };
      return obj._id || obj.id || `unknown-${idx}`;
    }
    return `unknown-${idx}`;
  };

  const initialPlanId = initialPlan?.id || (initialPlan as unknown as { _id?: string })?._id || "";
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
    resolver: zodResolver(createSubscriptionSchema) as unknown as Resolver<CreateSubscriptionFormValues>,
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

  // Sync form values when initialCustomerId or initialPlan changes
  React.useEffect(() => {
    if (isOpen) {
      const pId = initialPlan?.id || (initialPlan as unknown as { _id?: string })?._id || "";
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

  const watchedPermittedBranches =
    useWatch({
      control,
      name: "permittedBranchIds",
    }) || [];

  const handleAddServiceRow = () => {
    setServiceAddError(null);
    if (!selectedServiceId) {
      setServiceAddError("Please select a service to add");
      return;
    }

    const entitlements = getValues("entitlements") || [];
    if (entitlements.some((e) => e.serviceId === selectedServiceId)) {
      setServiceAddError("This service is already added to entitlements");
      return;
    }

    const parsedQty = parseInt(selectedQuantity, 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
      setServiceAddError("Quantity must be a positive number (at least 1)");
      return;
    }

    append({
      serviceId: selectedServiceId,
      quantity: parsedQty,
    });

    setSelectedServiceId("");
    setSelectedQuantity("1");
  };

  const handleApplyPlanTemplate = (planId: string) => {
    setSelectedPlanTemplateId(planId);
    if (!planId) {
      setValue("planId", undefined, { shouldValidate: true });
      return;
    }
    const match = planTemplates.find(
      (p: SubscriptionPlan) =>
        p.id === planId || (p as unknown as { _id?: string })._id === planId
    );
    if (!match) return;

    // Set planId in form state
    setValue("planId", planId, { shouldValidate: true });

    // Autofill suggested price ONLY if user hasn't already entered a custom agreed price
    const currentPrice = getValues("price");
    if (currentPrice === undefined || currentPrice === null || isNaN(currentPrice) || currentPrice === 0) {
      setValue("price", match.suggestedPrice, { shouldValidate: true });
    }

    // Autofill validity dates
    const end = format(addMonths(new Date(), match.validityMonths || 6), "yyyy-MM-dd");
    setValue("endDate", end, { shouldValidate: true });

    // Clear and append entitlements from template, resolving any populated
    // service objects back to their string IDs before storing in the form.
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Active Selling Branch Notice / Missing Branch Error */}
      {!effectiveBranchId ? (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-2 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold">Active Selling Branch Required</p>
            <p className="text-[11px] leading-relaxed opacity-90">
              Subscription creation and sale invoice generation require an active branch selection. Please select your active branch before selling subscriptions.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-2.5 bg-muted/40 border border-border/80 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">Selling Branch:</span>
            <span>{effectiveBranchName}</span>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-medium">
            Invoice Branch
          </span>
        </div>
      )}

      {branchValidationError && (
        <div className="p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{branchValidationError}</span>
        </div>
      )}
      {/* Optional Plan Template Selector */}
      {planTemplates.length > 0 && (
        <div className="p-3 bg-muted/40 border border-primary/20 rounded-xl space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary">
            Quick-Fill from Plan Template (Optional)
          </label>
          <select
            value={selectedPlanTemplateId}
            onChange={(e) => handleApplyPlanTemplate(e.target.value)}
            disabled={isLoading}
            className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">-- Start from scratch (Custom package) --</option>
            {planTemplates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Suggested ₹{p.suggestedPrice} - {p.validityMonths}m - {p.entitlements.length} services)
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">
            Selecting a template pre-fills services and pricing, which you can customize below for this customer.
          </p>
        </div>
      )}

      {/* Customer Selection */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Customer <span className="text-destructive">*</span>
        </label>
        <Controller
          name="customerId"
          control={control}
          render={({ field }) => (
            <CustomerSelector
              value={field.value}
              onChange={(id) => field.onChange(id)}
              error={errors.customerId?.message}
              disabled={isLoading}
            />
          )}
        />
      </div>

      {/* Custom Subscription Price */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Customer-Specific Subscription Price (₹) <span className="text-destructive">*</span>
        </label>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Enter custom agreed price (must be greater than 0)..."
          disabled={isLoading}
          {...register("price", { valueAsNumber: true })}
          className="h-9 text-xs"
        />
        {errors.price && (
          <p className="text-[11px] text-destructive">{errors.price.message}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Note: Subscription prices are set per customer. There is no catalog/master price.
        </p>
      </div>

      {/* Service Entitlements Builder */}
      <div className="space-y-2 border border-border/80 rounded-xl p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Service Entitlements <span className="text-destructive">*</span>
          </label>
          <span className="text-[11px] text-muted-foreground font-medium">
            {fields.length} {fields.length === 1 ? "service" : "services"} added
          </span>
        </div>

        {/* Add Row Controls */}
        {/* Grid: select takes remaining space, qty is fixed, button is icon-only */}
        <div className="grid grid-cols-[1fr_5rem_auto] gap-2 w-full min-w-0">
          <select
            value={selectedServiceId}
            onChange={(e) => {
              setSelectedServiceId(e.target.value);
              setServiceAddError(null);
            }}
            disabled={isLoading || isLoadingServices}
            className="min-w-0 w-full h-9 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring truncate"
          >
            <option value="">-- Choose a service --</option>
            {activeServices.map((service) => (
              <option
                key={service.id}
                value={service.id}
                disabled={fields.some((item) => item.serviceId === service.id)}
              >
                {service.name} {service.code ? `(${service.code})` : ""}
              </option>
            ))}
          </select>

          <Input
            type="number"
            min="1"
            step="1"
            value={selectedQuantity}
            onChange={(e) => setSelectedQuantity(e.target.value)}
            placeholder="Qty"
            disabled={isLoading}
            className="h-9 text-xs w-full"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddServiceRow}
            disabled={isLoading || isLoadingServices}
            className="h-9 text-xs gap-1 cursor-pointer shrink-0 px-3"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>

        {serviceAddError && (
          <p className="text-[11px] text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {serviceAddError}
          </p>
        )}

        {/* Configured Entitlements List */}
        {fields.length > 0 ? (
          <div className="space-y-1.5 mt-2">
            {fields.map((fieldItem, index) => {
              // fieldItem.serviceId should already be a plain string (resolved
              // in resolveServiceId above), but guard here too for safety.
              const safeServiceId = resolveServiceId(fieldItem.serviceId, index);
              const matchedService = allServices.find((s) => s.id === safeServiceId);
              return (
                <div
                  key={fieldItem.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs gap-2"
                >
                  <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                    <span className="font-semibold text-foreground truncate">
                      {matchedService?.name || safeServiceId}
                    </span>
                    {matchedService?.code && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        ({matchedService.code})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <label htmlFor={`entitlement-qty-${index}`} className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Qty:
                      </label>
                      <Input
                        id={`entitlement-qty-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        disabled={isLoading}
                        className="h-7 w-20 text-xs px-2 text-right font-bold text-primary"
                        {...register(`entitlements.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded cursor-pointer ml-1"
                      title="Remove Entitlement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground py-2 text-center">
            No service entitlements added yet. Add at least one service.
          </p>
        )}

        {errors.entitlements && (
          <p className="text-[11px] text-destructive">{errors.entitlements.message}</p>
        )}
      </div>

      {/* Permitted Branches Selection */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Permitted Branches
          </label>
          <span className="text-[10px] text-muted-foreground">
            {watchedPermittedBranches.length === 0
              ? "All Branches (Default)"
              : `${watchedPermittedBranches.length} branch(es) selected`}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-background">
          <button
            type="button"
            onClick={() => setValue("permittedBranchIds", [], { shouldValidate: true })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              watchedPermittedBranches.length === 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-3 w-3" /> All Branches
          </button>

          {availableBranches.map((branch) => {
            const isSelected = watchedPermittedBranches.includes(branch.id);
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => toggleBranch(branch.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {branch.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Validity Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Start Date <span className="text-destructive">*</span>
          </label>
          <Input
            type="date"
            disabled={isLoading}
            {...register("startDate")}
            className="h-9 text-xs"
          />
          {errors.startDate && (
            <p className="text-[11px] text-destructive">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            End Date <span className="text-destructive">*</span>
          </label>
          <Input
            type="date"
            disabled={isLoading}
            {...register("endDate")}
            className="h-9 text-xs"
          />
          {errors.endDate && (
            <p className="text-[11px] text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notes (Optional)
        </label>
        <Textarea
          placeholder="Any customer preferences, terms, or conditions..."
          rows={2}
          disabled={isLoading}
          {...register("notes")}
          className="text-xs"
        />
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
          className="h-9 text-xs cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isLoading || !effectiveBranchId}
          className="h-9 text-xs cursor-pointer gap-1.5"
          title={
            !effectiveBranchId
              ? "Select an active branch to sell subscriptions"
              : undefined
          }
        >
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Sell Subscription
        </Button>
      </div>
    </form>
  );
}
