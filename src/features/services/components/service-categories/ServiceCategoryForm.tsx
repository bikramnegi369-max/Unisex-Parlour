"use client";

import React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceCategorySchema, type ServiceCategoryFormValues } from "../../schemas/serviceCategory.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { mapBackendValidationErrors } from "@/lib/api/errors";

interface ServiceCategoryFormProps {
  initialCategory?: ServiceCategoryFormValues;
  onSubmit: (values: ServiceCategoryFormValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel?: string;
  error?: unknown;
}

export default function ServiceCategoryForm({
  initialCategory,
  onSubmit,
  isSubmitting,
  onCancel,
  submitLabel = "Save Category",
  error,
}: ServiceCategoryFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ServiceCategoryFormValues>({
    resolver: zodResolver(serviceCategorySchema) as unknown as Resolver<ServiceCategoryFormValues>,
    defaultValues: initialCategory || {
      name: "",
      description: "",
      displayOrder: 0,
    },
  });

  // Effect to map server validation errors
  React.useEffect(() => {
    if (error) {
      mapBackendValidationErrors(error, setError);
    }
  }, [error, setError]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
      <div>
        <label htmlFor="category-name" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Category Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="category-name"
          placeholder="e.g. Haircut, Spa, Nails"
          disabled={isSubmitting}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="category-desc" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Description
        </label>
        <Input
          id="category-desc"
          placeholder="Brief description of the category..."
          disabled={isSubmitting}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="category-display-order" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Display Order
        </label>
        <Input
          id="category-display-order"
          type="number"
          placeholder="0"
          disabled={isSubmitting}
          {...register("displayOrder", { valueAsNumber: true })}
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
