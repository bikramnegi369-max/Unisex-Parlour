import React, { useMemo, useState, useEffect, useRef } from "react";
import { useForm, type Path, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerFormValues } from "../schemas/customer.schema";
import { type Customer, type CustomerPayload } from "../types/customer.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loader2, X, Search, Check } from "lucide-react";
import { getCustomers } from "../api/customers.api";
import { mapBackendValidationErrors } from "@/lib/api/errors";
import { useDebounce } from "@/hooks/useDebounce";

interface CustomerFormProps {
  initialCustomer?: Customer;
  onSubmit: (data: CustomerPayload) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
  error?: unknown;
}

export default function CustomerForm({
  initialCustomer,
  onSubmit,
  isSubmitting,
  onCancel,
  submitLabel,
  error,
}: CustomerFormProps) {
  // Local state for Tag Chips
  const [tags, setTags] = useState<string[]>(
    initialCustomer?.tags || []
  );
  const [tagInput, setTagInput] = useState("");

  // Local state for Searchable Referrer Autocomplete
  const [referrerSearch, setReferrerSearch] = useState("");
  const [referrerResults, setReferrerResults] = useState<Customer[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<Customer | null>(null);
  const [isSearchingReferrer, setIsSearchingReferrer] = useState(false);
  const [showReferrerDropdown, setShowReferrerDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      gender: (initialCustomer.gender || "prefer_not_to_say") as CustomerFormValues["gender"],
      dateOfBirth: initialCustomer.dateOfBirth ? initialCustomer.dateOfBirth.split("T")[0] : "",
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
      acquisitionSource: (initialCustomer.acquisitionSource || "walk_in") as CustomerFormValues["acquisitionSource"],
      referredByCustomerId: initialCustomer.referredByCustomerId || "",
      status: (initialCustomer.status || "active") as CustomerFormValues["status"],
      allergies: Array.isArray(initialCustomer.allergies) ? initialCustomer.allergies.join(", ") : initialCustomer.allergies || "",
      sensitivities: Array.isArray(initialCustomer.sensitivities) ? initialCustomer.sensitivities.join(", ") : initialCustomer.sensitivities || "",
      tags: Array.isArray(initialCustomer.tags) ? initialCustomer.tags.join(", ") : initialCustomer.tags || "",
      loyaltyPoints: initialCustomer.loyaltyPoints ?? 0,
    };
  }, [initialCustomer]);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as unknown as Resolver<CustomerFormValues>,
    defaultValues,
  });

  // Re-synchronize form default values and tag chips state when initialCustomer changes
  useEffect(() => {
    reset(defaultValues);
    setTags(initialCustomer?.tags || []);
  }, [defaultValues, reset, initialCustomer]);

  // Effect to map server validation errors
  useEffect(() => {
    if (error) {
      mapBackendValidationErrors(error, setError);
    }
  }, [error, setError]);

  // Load initial referrer customer info if edit mode
  useEffect(() => {
    if (initialCustomer?.referredByCustomerId) {
      getCustomers({ search: undefined, page: 1, limit: 100 })
        .then((res) => {
          const matched = res.data.find(
            (c) => c.id === initialCustomer.referredByCustomerId || c._id === initialCustomer.referredByCustomerId
          );
          if (matched) {
            setSelectedReferrer(matched);
            setReferrerSearch(matched.name);
          }
        })
        .catch((err) => console.error("Failed to load referrer profile details:", err));
    } else {
      setSelectedReferrer(null);
      setReferrerSearch("");
    }
  }, [initialCustomer]);

  const debouncedReferrerSearch = useDebounce(referrerSearch, 300);

  // Debounced search for referrer dropdown (with race-condition protection and active filter)
  useEffect(() => {
    if (!debouncedReferrerSearch.trim() || (selectedReferrer && debouncedReferrerSearch === selectedReferrer.name)) {
      return;
    }

    let isCurrent = true;
    setIsSearchingReferrer(true);

    getCustomers({ search: debouncedReferrerSearch.trim(), page: 1, limit: 5 })
      .then((response) => {
        if (isCurrent) {
          // Exclude self and verify referrer status is active
          const filtered = response.data.filter(
            (c) => c.id !== initialCustomer?.id && c.status === "active"
          );
          setReferrerResults(filtered);
        }
      })
      .catch((err) => {
        console.error("Referrer lookup failed:", err);
      })
      .finally(() => {
        if (isCurrent) {
          setIsSearchingReferrer(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [debouncedReferrerSearch, selectedReferrer, initialCustomer]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowReferrerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const sanitized = tagInput.trim().replace(/,/g, "").toLowerCase();
      if (sanitized && !tags.includes(sanitized)) {
        const nextTags = [...tags, sanitized];
        setTags(nextTags);
        setValue("tags", nextTags.join(", "));
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    const nextTags = tags.filter((_, idx) => idx !== indexToRemove);
    setTags(nextTags);
    setValue("tags", nextTags.join(", "));
  };

  const handleSelectReferrer = (customer: Customer) => {
    setSelectedReferrer(customer);
    setReferrerSearch(customer.name);
    setReferrerResults([]);
    setValue("referredByCustomerId", customer.id);
    setShowReferrerDropdown(false);
  };

  const handleClearReferrer = () => {
    setSelectedReferrer(null);
    setReferrerSearch("");
    setReferrerResults([]);
    setValue("referredByCustomerId", "");
  };

  const handleFormSubmit = (values: CustomerFormValues) => {
    // Explicitly omit loyaltyPoints from submit payload to secure it server-side
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { loyaltyPoints, ...cleanValues } = values;

    const formattedPayload = {
      ...cleanValues,
      allergies: values.allergies
        ? values.allergies.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      sensitivities: values.sensitivities
        ? values.sensitivities.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      tags: tags.map((t) => t.trim()).filter(Boolean),
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
                  {...register(channel.id as Path<CustomerFormValues>)}
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

          {/* Searchable Referrer Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label htmlFor="referredBySearch" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Referred By Customer
            </label>
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="referredBySearch"
                placeholder="Search referrer by name..."
                value={referrerSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setReferrerSearch(val);
                  if (!val.trim()) {
                    setReferrerResults([]);
                  }
                  setShowReferrerDropdown(true);
                }}
                onFocus={() => setShowReferrerDropdown(true)}
                disabled={isSubmitting}
                className="pl-9 pr-8"
              />
              {referrerSearch && (
                <button
                  type="button"
                  onClick={handleClearReferrer}
                  className="absolute right-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* hidden field to bind form values */}
            <input type="hidden" {...register("referredByCustomerId")} />

            {showReferrerDropdown && (referrerResults.length > 0 || isSearchingReferrer) && (
              <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {isSearchingReferrer ? (
                  <div className="p-3 text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Searching...
                  </div>
                ) : (
                  <ul className="py-1">
                    {referrerResults.map((customer) => (
                      <li key={customer.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectReferrer(customer)}
                          className="flex items-center justify-between w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.phone}</p>
                          </div>
                          {selectedReferrer?.id === customer.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="loyaltyPoints" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Loyalty Points
            </label>
            <Input
              id="loyaltyPoints"
              type="number"
              min="0"
              readOnly
              placeholder="0"
              className="bg-muted text-muted-foreground cursor-not-allowed"
              {...register("loyaltyPoints")}
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground font-semibold">
              Read-only on profile updates
            </p>
          </div>

          {/* Interactive Tag Chips Component */}
          <div className="md:col-span-2 space-y-2">
            <label htmlFor="tagInput" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-background border border-input rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              {tags.map((tag, idx) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(idx)}
                    className="text-primary/70 hover:text-primary hover:bg-primary/20 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                id="tagInput"
                placeholder={tags.length === 0 ? "Type tag name and press Enter..." : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                disabled={isSubmitting}
                className="flex-1 bg-transparent text-sm focus:outline-none min-w-[120px]"
              />
            </div>
            {/* hidden field to register Zod schema tags string */}
            <input type="hidden" {...register("tags")} />
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


