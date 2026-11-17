import { z } from "zod";
import { PAYMENT_METHODS } from "../constants/payment.js";

const paymentMethodSchema = z.enum(PAYMENT_METHODS);

export const createPaymentSchema = z.object({
  method: paymentMethodSchema,
  amount: z.number().positive().multipleOf(0.01),
});

export const createRefundSchema = z.object({
  amount: z.number().positive().multipleOf(0.01),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
