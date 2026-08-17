import { z } from "zod";

export const createBranchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required"),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

export const updateBranchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export type CreateBranchFormValues = z.infer<typeof createBranchSchema>;
export type UpdateBranchFormValues = z.infer<typeof updateBranchSchema>;
