import { z } from "zod";

export const serviceCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  description: z.string().trim().optional(),
  displayOrder: z.coerce.number().min(0, "Display order must be at least 0").default(0),
});

export type ServiceCategoryFormValues = z.infer<typeof serviceCategorySchema>;
