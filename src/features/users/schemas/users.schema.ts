import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const basePhoneSchema = z
  .string()
  .min(6, "Phone number must be at least 6 digits")
  .max(20, "Phone number must be less than 20 characters")
  .refine((val) => phoneRegex.test(val.replace(/[\s()-]/g, "")), {
    message: "Please enter a valid phone number (e.g. +1234567890)",
  });

export const createUserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .trim(),
  phone: basePhoneSchema,
  roleId: z.string().min(1, "Role is required"),
  branchAccess: z.array(z.string()).default([]),
  hasOrgWideAccess: z.boolean().default(false),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  phone: basePhoneSchema,
  branchAccess: z.array(z.string()).default([]),
  hasOrgWideAccess: z.boolean().default(false),
});

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
