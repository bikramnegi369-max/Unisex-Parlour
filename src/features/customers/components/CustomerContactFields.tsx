"use client";

import React from "react";
import { type UseFormRegister, type FieldErrors } from "react-hook-form";
import { type CustomerFormValues } from "../schemas/customer.schema";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CustomerContactFieldsProps {
  register: UseFormRegister<CustomerFormValues>;
  errors: FieldErrors<CustomerFormValues>;
  disabled: boolean;
}

export function CustomerContactFields({ register, errors, disabled }: CustomerContactFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="gender" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Gender
          </label>
          <Select
            id="gender"
            className={errors.gender ? "border-destructive focus-visible:ring-destructive" : ""}
            aria-invalid={errors.gender ? "true" : "false"}
            aria-describedby={errors.gender ? "gender-error" : undefined}
            disabled={disabled}
            {...register("gender")}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </Select>
          {errors.gender && (
            <p id="gender-error" className="mt-1 text-xs font-medium text-destructive">{errors.gender.message}</p>
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
            aria-invalid={errors.dateOfBirth ? "true" : "false"}
            aria-describedby={errors.dateOfBirth ? "dob-error" : undefined}
            disabled={disabled}
            {...register("dateOfBirth")}
          />
          {errors.dateOfBirth && (
            <p id="dob-error" className="mt-1 text-xs font-medium text-destructive">{errors.dateOfBirth.message}</p>
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
          aria-invalid={errors.address ? "true" : "false"}
          aria-describedby={errors.address ? "address-error" : undefined}
          disabled={disabled}
          {...register("address")}
        />
        {errors.address && (
          <p id="address-error" className="mt-1 text-xs font-medium text-destructive">{errors.address.message}</p>
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
          className={cn(
            "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            errors.notes ? "border-destructive focus-visible:ring-destructive" : ""
          )}
          aria-invalid={errors.notes ? "true" : "false"}
          aria-describedby={errors.notes ? "notes-error" : undefined}
          disabled={disabled}
          {...register("notes")}
        />
        {errors.notes && (
          <p id="notes-error" className="mt-1 text-xs font-medium text-destructive">{errors.notes.message}</p>
        )}
      </div>
    </div>
  );
}
