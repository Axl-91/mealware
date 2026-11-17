import { z } from "zod";
import { ORDER_TYPES, ORDER_STATUSES } from "../constants/order.js";

const orderTypeSchema = z.enum(ORDER_TYPES);
const orderStatusSchema = z.enum(ORDER_STATUSES);

const orderItemSchema = z.object({
  menuItemId: z.uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().trim().nullable().optional(),
});

const orderCustomerNameSchema = z
  .string()
  .trim()
  .transform((name) => name.replace(/\s+/g, " "))
  .pipe(z.string().min(1).max(150));

const orderNotesSchema = z.string().trim().nullable();

export const createOrderSchema = z.object({
  type: orderTypeSchema,
  customerName: orderCustomerNameSchema.nullable().optional(),
  notes: orderNotesSchema.optional(),
  items: z.array(orderItemSchema).min(1),
});

export const updateOrderSchema = z.object({
  type: orderTypeSchema,
  customerName: orderCustomerNameSchema.nullable(),
  notes: orderNotesSchema,
  items: z.array(orderItemSchema).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
