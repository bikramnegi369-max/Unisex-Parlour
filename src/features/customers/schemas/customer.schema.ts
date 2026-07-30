import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const basePhoneSchema = z
  .string()
  .min(6, "Phone number must be at least 6 digits")
  .max(20, "Phone number must be less than 20 characters")
  .refine((val) => phoneRegex.test(val.replace(/[\s()-]/g, "")), {
    message: "Please enter a valid phone number (e.g. +1234567890)",
  });

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  phone: basePhoneSchema,
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .or(z.literal("")),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).default("prefer_not_to_say"),
  dateOfBirth: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      { message: "Date of birth must be a valid past date" }
    )
    .optional()
    .or(z.literal("")),
  alternatePhone: z
    .string()
    .trim()
    .refine((val) => !val || phoneRegex.test(val.replace(/[\s()-]/g, "")), {
      message: "Please enter a valid alternate phone number",
    })
    .optional()
    .or(z.literal("")),
  address: z.object({
    addressLine1: z.string().trim().default(""),
    addressLine2: z.string().trim().default(""),
    city: z.string().trim().default(""),
    state: z.string().trim().default(""),
    postalCode: z.string().trim().default(""),
    country: z.string().trim().default(""),
  }).default({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  }),
  preferences: z.object({
    drinkPreference: z.string().trim().default(""),
    preferredContactTime: z.string().trim().default(""),
    language: z.string().trim().default(""),
    remarks: z.string().trim().default(""),
  }).default({
    drinkPreference: "",
    preferredContactTime: "",
    language: "",
    remarks: "",
  }),
  marketingPreferences: z.object({
    sms: z.boolean().default(false),
    email: z.boolean().default(false),
    whatsapp: z.boolean().default(false),
    promotions: z.boolean().default(false),
    appointmentReminders: z.boolean().default(false),
  }).default({
    sms: false,
    email: false,
    whatsapp: false,
    promotions: false,
    appointmentReminders: false,
  }),
  doNotContact: z.boolean().default(false),
  acquisitionSource: z
    .enum(["walk_in", "instagram", "facebook", "google", "website", "advertisement", "referral", "other"])
    .default("walk_in"),
  referredByCustomerId: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "blocked"]).default("active"),
  allergies: z.string().trim().default(""),
  sensitivities: z.string().trim().default(""),
  tags: z.string().trim().default(""),
  loyaltyPoints: z.coerce.number().min(0).default(0),
});

export type CustomerFormValues = {
  name: string;
  phone: string;
  email: string;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
  dateOfBirth: string;
  alternatePhone: string;
  address: {
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  preferences: {
    drinkPreference: string;
    preferredContactTime: string;
    language: string;
    remarks: string;
  };
  marketingPreferences: {
    sms: boolean;
    email: boolean;
    whatsapp: boolean;
    promotions: boolean;
    appointmentReminders: boolean;
  };
  doNotContact: boolean;
  acquisitionSource: "walk_in" | "instagram" | "facebook" | "google" | "website" | "advertisement" | "referral" | "other";
  referredByCustomerId: string;
  status: "active" | "inactive" | "blocked";
  allergies: string;
  sensitivities: string;
  tags: string;
  loyaltyPoints: number;
};
