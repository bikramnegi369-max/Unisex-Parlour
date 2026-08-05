import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const phoneSchema = z
  .string()
  .trim()
  .refine((val) => !val || phoneRegex.test(val.replace(/[\s()-]/g, "")), {
    message: "Please enter a valid phone number (e.g. +1234567890)",
  })
  .optional()
  .or(z.literal(""));

export const employeeSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters"),
  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  phone: phoneSchema,
  role: z.enum(["Owner", "Manager", "Receptionist", "Stylist", "Accountant"], {
    error: "Please select a valid role",
  }),
  branchIds: z
    .array(z.string().min(1, "Branch ID cannot be empty"))
    .min(1, "At least one branch assignment is required"),
  specialties: z
    .array(z.string())
    .optional()
    .default([]),
  status: z
    .enum(["active", "inactive"])
    .default("active"),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
