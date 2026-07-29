"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerFormValues } from "../schemas/customer.schema";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { CustomerBasicFields } from "./CustomerBasicFields";
import { CustomerContactFields } from "./CustomerContactFields";

interface CustomerFormProps {
  initialData?: CustomerFormValues;
  onSubmit: (data: CustomerFormValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
}

export default function CustomerForm({
  initialData,
  onSubmit,
  isSubmitting,
  onCancel,
  submitLabel,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData || {
      name: "",
      phone: "",
      email: "",
      gender: "",
      dateOfBirth: "",
      address: "",
      notes: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
      <CustomerBasicFields register={register} errors={errors} disabled={isSubmitting} />
      <CustomerContactFields register={register} errors={errors} disabled={isSubmitting} />

      <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[100px] cursor-pointer">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

