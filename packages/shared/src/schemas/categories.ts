import { z } from "zod";

const categoryNameSchema = z
  .string()
  .trim()
  .transform((name) => name.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1)
      .max(100)
      .refine((name) => !name.includes("."), {
        message: "Category name cannot contain periods",
      }),
  );

export const createCategorySchema = z.object({
  name: categoryNameSchema,
});

export const updateCategorySchema = z.object({
  name: categoryNameSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
