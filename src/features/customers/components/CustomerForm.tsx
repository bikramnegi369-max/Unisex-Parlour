"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerFormValues } from "../schemas/customer.schema";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
      <div>
        <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Full Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="name"
          placeholder="e.g. John Doe"
          className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-1 text-xs font-medium text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Phone Number <span className="text-destructive">*</span>
        </label>
        <Input
          id="phone"
          placeholder="e.g. +1234567890"
          className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
          {...register("phone")}
        />
        {errors.phone && (
          <p className="mt-1 text-xs font-medium text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="e.g. john@example.com"
          className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-1 text-xs font-medium text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="gender" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Gender
          </label>
          <Select id="gender" {...register("gender")}>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </Select>
          {errors.gender && (
            <p className="mt-1 text-xs font-medium text-destructive">{errors.gender.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Date of Birth
          </label>
          <Input
            id="dateOfBirth"
            type="date"
            className={errors.dateOfBirth ? "border-destructive focus-visible:ring-destructive" : ""}
            {...register("dateOfBirth")}
          />
          {errors.dateOfBirth && (
            <p className="mt-1 text-xs font-medium text-destructive">{errors.dateOfBirth.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Physical Address
        </label>
        <Input
          id="address"
          placeholder="Street address, city, postcode"
          className={errors.address ? "border-destructive focus-visible:ring-destructive" : ""}
          {...register("address")}
        />
        {errors.address && (
          <p className="mt-1 text-xs font-medium text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Internal Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Add any relevant customer details, styling history, preferences..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...register("notes")}
        />
        {errors.notes && (
          <p className="mt-1 text-xs font-medium text-destructive">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[100px]">
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
