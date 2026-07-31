"use client";
"use no memo";

import React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema, type ServiceFormValues } from "../../schemas/service.schema";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { mapBackendValidationErrors } from "@/lib/api/errors";
import { Loader2 } from "lucide-react";
import type { ServiceCategory } from "../../types/category.types";

interface ServiceFormProps {
  categories: ServiceCategory[];
  initialService?: Partial<ServiceFormValues>;
  onSubmit: (values: ServiceFormValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel?: string;
  error?: unknown;
}

export default function ServiceForm({
  categories,
  initialService,
  onSubmit,
  isSubmitting,
  onCancel,
  submitLabel = "Save Service",
  error,
}: ServiceFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema) as unknown as Resolver<ServiceFormValues>,
    defaultValues: {
      name: initialService?.name || "",
      description: initialService?.description || "",
      categoryId: initialService?.categoryId || "",
      duration: initialService?.duration ?? 30,
      basePrice: initialService?.basePrice ?? 0,
      taxable: initialService?.taxable ?? true,
      taxRate: initialService?.taxRate ?? 0,
      displayOrder: initialService?.displayOrder ?? 0,
    },
  });

  const isTaxable = watch("taxable");

  // Effect to map server validation errors
  React.useEffect(() => {
    if (error) {
      mapBackendValidationErrors(error, setError);
    }
  }, [error, setError]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
      <div>
        <label htmlFor="service-name" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Service Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="service-name"
          placeholder="e.g. Premium Haircut, Gel Manicure"
          disabled={isSubmitting}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="service-desc" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Description
        </label>
        <Input
          id="service-desc"
          placeholder="Brief details about the service treatment..."
          disabled={isSubmitting}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="service-category" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Category <span className="text-destructive">*</span>
        </label>
        <Select
          id="service-category"
          disabled={isSubmitting}
          {...register("categoryId")}
        >
          <option value="">Select a Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
        {errors.categoryId && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.categoryId.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="service-duration" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Duration (mins) <span className="text-destructive">*</span>
          </label>
          <Input
            id="service-duration"
            type="number"
            placeholder="30"
            disabled={isSubmitting}
            {...register("duration")}
          />
          {errors.duration && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.duration.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="service-price" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Base Price ($) <span className="text-destructive">*</span>
          </label>
          <Input
            id="service-price"
            type="number"
            step="0.01"
            placeholder="0.00"
            disabled={isSubmitting}
            {...register("basePrice")}
          />
          {errors.basePrice && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.basePrice.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 py-2">
        <input
          id="service-taxable"
          type="checkbox"
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          {...register("taxable")}
        />
        <label htmlFor="service-taxable" className="text-sm font-medium text-foreground select-none cursor-pointer">
          This service is taxable
        </label>
      </div>

      {isTaxable && (
        <div>
          <label htmlFor="service-tax-rate" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Tax Rate (%)
          </label>
          <Input
            id="service-tax-rate"
            type="number"
            step="0.01"
            placeholder="0.00"
            disabled={isSubmitting}
            {...register("taxRate")}
          />
          {errors.taxRate && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.taxRate.message}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="service-display-order" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Display Order
        </label>
        <Input
          id="service-display-order"
          type="number"
          placeholder="0"
          disabled={isSubmitting}
          {...register("displayOrder")}
        />
        {errors.displayOrder && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.displayOrder.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
