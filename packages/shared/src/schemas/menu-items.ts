import { z } from "zod";

const menuItemNameSchema = z
  .string()
  .trim()
  .transform((name) => name.replace(/\s+/g, " "))
  .pipe(z.string().min(1).max(150));

const menuItemDescriptionSchema = z.string().trim().nullable();

const menuItemPriceSchema = z
  .number()
  .refine(Number.isFinite, { message: "Price must be a finite number" })
  .min(0)
  .max(99_999_999.99)
  .multipleOf(0.01);

const menuItemCategoryIdSchema = z.uuid();

export const createMenuItemSchema = z.object({
  categoryId: menuItemCategoryIdSchema,
  name: menuItemNameSchema,
  description: menuItemDescriptionSchema.optional(),
  price: menuItemPriceSchema,
});

export const updateMenuItemSchema = z.object({
  categoryId: menuItemCategoryIdSchema,
  name: menuItemNameSchema,
  description: menuItemDescriptionSchema,
  price: menuItemPriceSchema,
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
