"use client";

import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerFormValues } from "../schemas/customer.schema";
import { type Customer } from "../types/customer.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerFormProps {
  initialCustomer?: Customer;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
}

export default function CustomerForm({
  initialCustomer,
  onSubmit,
  isSubmitting,
  onCancel,
  submitLabel,
}: CustomerFormProps) {
  const defaultValues = useMemo(() => {
    if (!initialCustomer) {
      return {
        name: "",
        phone: "",
        email: "",
        gender: "prefer_not_to_say" as const,
        dateOfBirth: "",
        alternatePhone: "",
        address: {
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
        preferences: {
          drinkPreference: "",
          preferredContactTime: "",
          language: "",
          remarks: "",
        },
        marketingPreferences: {
          sms: false,
          email: false,
          whatsapp: false,
          promotions: false,
          appointmentReminders: false,
        },
        doNotContact: false,
        acquisitionSource: "walk_in" as const,
        referredByCustomerId: "",
        status: "active" as const,
        allergies: "",
        sensitivities: "",
        tags: "",
        loyaltyPoints: 0,
      };
    }

    return {
      name: initialCustomer.name || "",
      phone: initialCustomer.phone || "",
      email: initialCustomer.email || "",
      gender: (initialCustomer.gender || "prefer_not_to_say") as any,
      dateOfBirth: initialCustomer.dateOfBirth || "",
      alternatePhone: initialCustomer.alternatePhone || "",
      address: {
        addressLine1: initialCustomer.address?.addressLine1 || "",
        addressLine2: initialCustomer.address?.addressLine2 || "",
        city: initialCustomer.address?.city || "",
        state: initialCustomer.address?.state || "",
        postalCode: initialCustomer.address?.postalCode || "",
        country: initialCustomer.address?.country || "",
      },
      preferences: {
        drinkPreference: initialCustomer.preferences?.drinkPreference || "",
        preferredContactTime: initialCustomer.preferences?.preferredContactTime || "",
        language: initialCustomer.preferences?.language || "",
        remarks: initialCustomer.preferences?.remarks || "",
      },
      marketingPreferences: {
        sms: !!initialCustomer.marketingPreferences?.sms,
        email: !!initialCustomer.marketingPreferences?.email,
        whatsapp: !!initialCustomer.marketingPreferences?.whatsapp,
        promotions: !!initialCustomer.marketingPreferences?.promotions,
        appointmentReminders: !!initialCustomer.marketingPreferences?.appointmentReminders,
      },
      doNotContact: !!initialCustomer.doNotContact,
      acquisitionSource: (initialCustomer.acquisitionSource || "walk_in") as any,
      referredByCustomerId: initialCustomer.referredByCustomerId || "",
      status: (initialCustomer.status || "active") as any,
      allergies: initialCustomer.allergies?.join(", ") || "",
      sensitivities: initialCustomer.sensitivities?.join(", ") || "",
      tags: initialCustomer.tags?.join(", ") || "",
      loyaltyPoints: initialCustomer.loyaltyPoints ?? 0,
    };
  }, [initialCustomer]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues,
  });

  const handleFormSubmit = (values: CustomerFormValues) => {
    const formattedPayload = {
      ...values,
      allergies: values.allergies
        ? values.allergies.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      sensitivities: values.sensitivities
        ? values.sensitivities.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      tags: values.tags
        ? values.tags.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      // Ensure email is null if empty as per backend schema default
      email: values.email || null,
      alternatePhone: values.alternatePhone || null,
      referredByCustomerId: values.referredByCustomerId || null,
    };
    onSubmit(formattedPayload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 py-2 text-left">
      {/* 1. Basic Information */}
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              placeholder="e.g. John Doe"
              className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("name")}
            />
            {errors.name && <p className="mt-1 text-xs font-medium text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Phone Number <span className="text-destructive">*</span>
            </label>
            <Input
              id="phone"
              placeholder="e.g. +1234567890"
              className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("phone")}
            />
            {errors.phone && <p className="mt-1 text-xs font-medium text-destructive">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="alternatePhone" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Alternate Phone
            </label>
            <Input
              id="alternatePhone"
              placeholder="e.g. +1987654321"
              className={errors.alternatePhone ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("alternatePhone")}
            />
            {errors.alternatePhone && <p className="mt-1 text-xs font-medium text-destructive">{errors.alternatePhone.message}</p>}
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
              disabled={isSubmitting}
              {...register("email")}
            />
            {errors.email && <p className="mt-1 text-xs font-medium text-destructive">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="gender" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Gender
            </label>
            <Select id="gender" disabled={isSubmitting} {...register("gender")}>
              <option value="prefer_not_to_say">Prefer Not To Say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Date of Birth
            </label>
            <Input
              id="dateOfBirth"
              type="date"
              className={errors.dateOfBirth ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("dateOfBirth")}
            />
            {errors.dateOfBirth && <p className="mt-1 text-xs font-medium text-destructive">{errors.dateOfBirth.message}</p>}
          </div>
        </div>
      </div>

      {/* 2. Contact & Address */}
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">Contact & Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="addressLine1" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Address Line 1
            </label>
            <Input
              id="addressLine1"
              placeholder="Street address, P.O. box"
              disabled={isSubmitting}
              {...register("address.addressLine1")}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="addressLine2" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Address Line 2
            </label>
            <Input
              id="addressLine2"
              placeholder="Apartment, suite, unit, building, floor"
              disabled={isSubmitting}
              {...register("address.addressLine2")}
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              City
            </label>
            <Input id="city" placeholder="City" disabled={isSubmitting} {...register("address.city")} />
          </div>

          <div>
            <label htmlFor="state" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              State / Province
            </label>
            <Input id="state" placeholder="State" disabled={isSubmitting} {...register("address.state")} />
          </div>

          <div>
            <label htmlFor="postalCode" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Postal / ZIP Code
            </label>
            <Input id="postalCode" placeholder="ZIP Code" disabled={isSubmitting} {...register("address.postalCode")} />
          </div>

          <div>
            <label htmlFor="country" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Country
            </label>
            <Input id="country" placeholder="Country" disabled={isSubmitting} {...register("address.country")} />
          </div>
        </div>
      </div>

      {/* 3. Preferences */}
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="drinkPreference" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Drink Preference
            </label>
            <Input
              id="drinkPreference"
              placeholder="e.g. Black Coffee, Green Tea"
              disabled={isSubmitting}
              {...register("preferences.drinkPreference")}
            />
          </div>

          <div>
            <label htmlFor="preferredContactTime" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Preferred Contact Time
            </label>
            <Input
              id="preferredContactTime"
              placeholder="e.g. Weekends, Evenings after 6 PM"
              disabled={isSubmitting}
              {...register("preferences.preferredContactTime")}
            />
          </div>

          <div>
            <label htmlFor="language" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Preferred Language
            </label>
            <Input
              id="language"
              placeholder="e.g. English, Spanish"
              disabled={isSubmitting}
              {...register("preferences.language")}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="remarks" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Remarks
            </label>
            <textarea
              id="remarks"
              rows={3}
              placeholder="General styling remarks, notes, or quirks..."
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              {...register("preferences.remarks")}
            />
          </div>
        </div>
      </div>

      {/* 4. Communication & Marketing */}
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">Communication & Marketing</h3>
        
        <div className="flex items-center gap-2 py-1">
          <input
            id="doNotContact"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            disabled={isSubmitting}
            {...register("doNotContact")}
          />
          <label htmlFor="doNotContact" className="text-sm font-semibold text-destructive cursor-pointer">
            DO NOT CONTACT (Check to restrict all outgoing communications)
          </label>
        </div>

        <div className="space-y-2 mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Allowed Marketing Channels</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: "marketingPreferences.sms", label: "SMS" },
              { id: "marketingPreferences.email", label: "Email" },
              { id: "marketingPreferences.whatsapp", label: "WhatsApp" },
              { id: "marketingPreferences.promotions", label: "Promotions" },
              { id: "marketingPreferences.appointmentReminders", label: "Reminders" },
            ].map((channel) => (
              <div key={channel.id} className="flex items-center gap-2">
                <input
                  id={channel.id}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  disabled={isSubmitting}
                  {...register(channel.id as any)}
                />
                <label htmlFor={channel.id} className="text-sm font-medium text-foreground cursor-pointer">
                  {channel.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. CRM & Administration */}
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">CRM & Account Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="acquisitionSource" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Acquisition Source
            </label>
            <Select id="acquisitionSource" disabled={isSubmitting} {...register("acquisitionSource")}>
              <option value="walk_in">Walk-in</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="google">Google</option>
              <option value="website">Website</option>
              <option value="advertisement">Advertisement</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div>
            <label htmlFor="status" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Account Status
            </label>
            <Select id="status" disabled={isSubmitting} {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </Select>
          </div>

          <div>
            <label htmlFor="referredByCustomerId" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Referred By Customer (ID)
            </label>
            <Input
              id="referredByCustomerId"
              placeholder="Referrer Customer ID"
              disabled={isSubmitting}
              {...register("referredByCustomerId")}
            />
          </div>

          <div>
            <label htmlFor="loyaltyPoints" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Loyalty Points
            </label>
            <Input
              id="loyaltyPoints"
              type="number"
              min="0"
              placeholder="0"
              disabled={isSubmitting}
              {...register("loyaltyPoints")}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="tags" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Tags (Comma separated)
            </label>
            <Input
              id="tags"
              placeholder="e.g. VIP, frequent, wedding"
              disabled={isSubmitting}
              {...register("tags")}
            />
          </div>
        </div>
      </div>

      {/* 6. Health Information */}
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">Health & Sensitivities</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="allergies" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Allergies (Comma separated)
            </label>
            <Input
              id="allergies"
              placeholder="e.g. Latex, Penicillin, Peanut Oil"
              disabled={isSubmitting}
              {...register("allergies")}
            />
          </div>

          <div>
            <label htmlFor="sensitivities" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Sensitivities (Comma separated)
            </label>
            <Input
              id="sensitivities"
              placeholder="e.g. Sensitive Skin, Ammonia, Hot Wax"
              disabled={isSubmitting}
              {...register("sensitivities")}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-25 cursor-pointer">
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

