import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export const employeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(phoneRegex, "Please enter a valid E.164 phone number (e.g. +919876543210)"),
  designation: z
    .string()
    .trim()
    .min(1, "Designation is required"),
  joiningDate: z
    .string()
    .min(1, "Joining date is required"),
  avatarUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal(""))
    .nullable(),
  status: z
    .enum(["active", "inactive", "suspended"])
    .default("active"),
  userId: z.string().trim().optional().nullable(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
