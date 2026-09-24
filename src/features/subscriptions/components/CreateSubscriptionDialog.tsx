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
}

export function CreateSubscriptionDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialCustomerId,
  initialPlan,
}: CreateSubscriptionDialogProps) {
  const { availableBranches } = useBranchContext();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [serviceAddError, setServiceAddError] = useState<string | null>(null);
  const [selectedPlanTemplateId, setSelectedPlanTemplateId] = useState<string>(
    initialPlan?.id || ""
  );

  // Fetch plan templates
  const { data: plansData } = useSubscriptionPlans({ isActive: true });
  const planTemplates: SubscriptionPlan[] = plansData?.data || [];

  // Fetch organization-global services
  const { data: servicesData, isLoading: isLoadingServices } = useServices({
    limit: 100,
  });
  const allServices: Service[] = servicesData?.data || [];
  const activeServices = allServices.filter((s) => s.isActive);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const sixMonthsLaterStr = format(addMonths(new Date(), 6), "yyyy-MM-dd");

  const defaultPrice = initialPlan?.suggestedPrice ?? 0;
  const defaultEndDate = initialPlan?.validityMonths
    ? format(addMonths(new Date(), initialPlan.validityMonths), "yyyy-MM-dd")
    : sixMonthsLaterStr;
  const defaultEntitlements = initialPlan?.entitlements
    ? initialPlan.entitlements.map((e) => ({
        serviceId: e.serviceId,
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

    if (selectedQuantity < 1) {
      setServiceAddError("Quantity must be at least 1");
      return;
    }

    append({
      serviceId: selectedServiceId,
      quantity: Number(selectedQuantity),
    });

    setSelectedServiceId("");
    setSelectedQuantity(1);
  };

  const handleApplyPlanTemplate = (planId: string) => {
    setSelectedPlanTemplateId(planId);
    if (!planId) return;
    const match = planTemplates.find((p: SubscriptionPlan) => p.id === planId);
    if (!match) return;

    // Autofill suggested price (can be modified)
    setValue("price", match.suggestedPrice, { shouldValidate: true });

    // Autofill validity dates
    const end = format(addMonths(new Date(), match.validityMonths || 6), "yyyy-MM-dd");
    setValue("endDate", end, { shouldValidate: true });

    // Clear and append entitlements from template
    setValue(
      "entitlements",
      match.entitlements.map((e) => ({
        serviceId: e.serviceId,
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
    await onSubmit(data);
    reset();
  };

  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
          min="0"
          step="0.01"
          placeholder="Enter custom agreed price..."
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={selectedServiceId}
            onChange={(e) => {
              setSelectedServiceId(e.target.value);
              setServiceAddError(null);
            }}
            disabled={isLoading || isLoadingServices}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">-- Choose Organization Service --</option>
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

          <div className="w-24">
            <Input
              type="number"
              min="1"
              step="1"
              value={selectedQuantity}
              onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              placeholder="Qty"
              disabled={isLoading}
              className="h-9 text-xs"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddServiceRow}
            disabled={isLoading || isLoadingServices}
            className="h-9 text-xs gap-1 cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
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
              const matchedService = allServices.find((s) => s.id === fieldItem.serviceId);
              return (
                <div
                  key={fieldItem.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-foreground truncate">
                      {matchedService?.name || fieldItem.serviceId}
                    </span>
                    {matchedService?.code && (
                      <span className="text-[10px] text-muted-foreground">
                        ({matchedService.code})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {fieldItem.quantity} {fieldItem.quantity === 1 ? "unit" : "units"}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded cursor-pointer"
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
          disabled={isLoading}
          className="h-9 text-xs cursor-pointer gap-1.5"
        >
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Sell Subscription
        </Button>
      </div>
    </form>
  );
}
