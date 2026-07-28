import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  phone: z
    .string()
    .min(6, "Phone number must be at least 6 digits")
    .max(20, "Phone number must be less than 20 characters")
    .refine((val) => phoneRegex.test(val.replace(/[\s()-]/g, "")), {
      message: "Please enter a valid phone number (e.g. +1234567890)",
    }),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .or(z.literal("")),
  gender: z.string().trim().optional().or(z.literal("")),
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
  address: z.string().trim().max(200, "Address must be less than 200 characters").optional().or(z.literal("")),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
