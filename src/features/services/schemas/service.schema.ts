import { z } from "zod";

export const serviceSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  description: z.string().trim().optional(),
  categoryId: z.string().min(1, "Category is required"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  basePrice: z.coerce.number().min(0, "Base price must be a positive number"),
  taxable: z.boolean().default(true),
  taxRate: z.coerce.number().min(0, "Tax rate must be at least 0").default(0),
  displayOrder: z.coerce.number().min(0, "Display order must be at least 0").default(0),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
