"use client";

import React from "react";
import { type UseFormRegister, type FieldErrors } from "react-hook-form";
import { type CustomerFormValues } from "../schemas/customer.schema";
import { Input } from "@/components/ui/input";

interface CustomerBasicFieldsProps {
  register: UseFormRegister<CustomerFormValues>;
  errors: FieldErrors<CustomerFormValues>;
  disabled: boolean;
}

export function CustomerBasicFields({ register, errors, disabled }: CustomerBasicFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Full Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="name"
          placeholder="e.g. John Doe"
          className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "name-error" : undefined}
          disabled={disabled}
          {...register("name")}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-xs font-medium text-destructive">{errors.name.message}</p>
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
          aria-invalid={errors.phone ? "true" : "false"}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          disabled={disabled}
          {...register("phone")}
        />
        {errors.phone && (
          <p id="phone-error" className="mt-1 text-xs font-medium text-destructive">{errors.phone.message}</p>
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
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "email-error" : undefined}
          disabled={disabled}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs font-medium text-destructive">{errors.email.message}</p>
        )}
      </div>
    </div>
  );
}
