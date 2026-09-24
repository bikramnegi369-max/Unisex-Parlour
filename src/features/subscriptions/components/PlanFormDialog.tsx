"use client";

import React, { useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Minus,
  Trash2,
  Layers,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useServices } from "@/features/services/hooks/services/useServices";
import {
  createSubscriptionPlanSchema,
  type CreateSubscriptionPlanFormValues,
} from "../schemas/plan.schema";
import type { SubscriptionPlan } from "../types/plan.types";
import type { Service } from "@/features/services/types/service.types";

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
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const { data: servicesData, isLoading: isLoadingServices } = useServices({
    limit: 100,
  });
  const allServices: Service[] = servicesData?.data || [];
  const activeServices = allServices.filter((s) => s.isActive);

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
          serviceId: e.serviceId,
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
    setSelectedServiceId("");
    setSelectedQuantity(1);
    setServiceError(null);
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
            serviceId: e.serviceId,
            quantity: e.quantity,
          })) || [],
        isActive: initialPlan?.isActive ?? true,
      });
    }
  }, [isOpen, initialPlan, reset]);

  if (!isOpen) return null;

  const handleAddEntitlement = () => {
    setServiceError(null);
    if (!selectedServiceId) {
      setServiceError("Please select a service");
      return;
    }

    if (fields.some((e) => e.serviceId === selectedServiceId)) {
      setServiceError("Service already added to plan");
      return;
    }

    if (selectedQuantity < 1) {
      setServiceError("Quantity must be at least 1");
      return;
    }

    append({
      serviceId: selectedServiceId,
      quantity: Number(selectedQuantity),
    });

    setSelectedServiceId("");
    setSelectedQuantity(1);
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

        {/* Add Row Controls */}
        <div className="flex items-start gap-2 bg-muted/40 p-2.5 rounded-lg border border-border">
          <div className="flex-1">
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              disabled={isLoading || isLoadingServices}
              aria-label="Select Service"
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">-- Choose Catalog Service --</option>
              {activeServices.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} (Catalog: ₹{srv.pricing?.basePrice ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div className="w-24">
            <Input
              type="number"
              min="1"
              max="1000"
              value={selectedQuantity}
              onChange={(e) => setSelectedQuantity(Number(e.target.value))}
              disabled={isLoading}
              placeholder="Qty"
              aria-label="Quantity"
              className="h-8 text-xs"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddEntitlement}
            disabled={isLoading || isLoadingServices || !selectedServiceId}
            className="h-8 text-xs gap-1 cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {serviceError && (
          <p className="text-[11px] text-destructive flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {serviceError}
          </p>
        )}

        {/* Current configured entitlements table */}
        {fields.length > 0 ? (
          <div className="border border-border rounded-md divide-y divide-border overflow-hidden bg-background">
            {fields.map((field, idx) => {
              const matchedService = allServices.find(
                (s) => s.id === field.serviceId,
              );
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
                        {matchedService?.name ||
                          "Service #" + field.serviceId.slice(-6)}
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
