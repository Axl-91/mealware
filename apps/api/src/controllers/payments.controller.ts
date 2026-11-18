import type { FastifyReply, FastifyRequest } from "fastify";
import { createPaymentSchema, createRefundSchema } from "@mealware/shared";
import { ZodError } from "zod";
import * as paymentsService from "../services/payments.service.js";
import { conflict, notFound, validationError } from "../utils/http-errors.js";

interface OrderParams {
  id: string;
}

interface PaymentParams {
  id: string;
}

const orderNotFound = (reply: FastifyReply) => {
  return notFound(reply, "ORDER_NOT_FOUND", "Order not found");
};

const paymentNotFound = (reply: FastifyReply) => {
  return notFound(reply, "PAYMENT_NOT_FOUND", "Payment not found");
};

const orderNotPayable = (reply: FastifyReply) => {
  return conflict(
    reply,
    "ORDER_NOT_PAYABLE",
    "Payments can only be registered for ready or completed orders",
  );
};

const amountExceedsBalance = (reply: FastifyReply) => {
  return conflict(
    reply,
    "PAYMENT_AMOUNT_EXCEEDS_BALANCE",
    "Payment amount exceeds the outstanding order balance",
  );
};

const amountExceedsRefundable = (reply: FastifyReply) => {
  return conflict(
    reply,
    "REFUND_AMOUNT_EXCEEDS_REFUNDABLE",
    "Refund amount exceeds the remaining refundable amount",
  );
};

export const createPaymentController = async (
  request: FastifyRequest<{ Params: OrderParams }>,
  reply: FastifyReply,
) => {
  try {
    const input = createPaymentSchema.parse(request.body);

    const result = await paymentsService.createPayment({
      ...input,
      orderId: request.params.id,
      restaurantId: request.user.restaurantId,
      createdBy: request.user.sub,
    });

    if (result.status === "order_not_found") {
      return orderNotFound(reply);
    }

    if (result.status === "order_not_payable") {
      return orderNotPayable(reply);
    }

    if (result.status === "amount_exceeds_balance") {
      return amountExceedsBalance(reply);
    }

    return reply.status(201).send({
      payment: result.payment,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(reply, error);
    }

    throw error;
  }
};

export const getPaymentsByOrderController = async (
  request: FastifyRequest<{ Params: OrderParams }>,
  reply: FastifyReply,
) => {
  const result = await paymentsService.getPaymentsByOrder({
    orderId: request.params.id,
    restaurantId: request.user.restaurantId,
  });

  if (result.status === "order_not_found") {
    return orderNotFound(reply);
  }

  return reply.status(200).send({
    payments: result.payments,
  });
};

export const createRefundController = async (
  request: FastifyRequest<{ Params: PaymentParams }>,
  reply: FastifyReply,
) => {
  try {
    const input = createRefundSchema.parse(request.body);

    const result = await paymentsService.createRefund({
      ...input,
      paymentId: request.params.id,
      restaurantId: request.user.restaurantId,
      createdBy: request.user.sub,
    });

    if (result.status === "payment_not_found") {
      return paymentNotFound(reply);
    }

    if (result.status === "order_not_found") {
      return orderNotFound(reply);
    }

    if (result.status === "amount_exceeds_refundable") {
      return amountExceedsRefundable(reply);
    }

    return reply.status(201).send({
      refund: result.refund,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(reply, error);
    }

    throw error;
  }
};

export const getRefundsByPaymentController = async (
  request: FastifyRequest<{ Params: PaymentParams }>,
  reply: FastifyReply,
) => {
  const refunds = await paymentsService.getRefundsByPayment({
    paymentId: request.params.id,
    restaurantId: request.user.restaurantId,
  });

  return reply.status(200).send({ refunds });
};
