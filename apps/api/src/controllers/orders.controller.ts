import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from "@mealware/shared";
import { ZodError } from "zod";
import * as ordersService from "../services/orders.service.js";
import { conflict, notFound, validationError } from "../utils/http-errors.js";

interface OrderParams {
  id: string;
}

const orderNotFound = (reply: FastifyReply) => {
  return notFound(reply, "ORDER_NOT_FOUND", "Order not found");
};

const menuItemNotFound = (reply: FastifyReply) => {
  return notFound(reply, "MENU_ITEM_NOT_FOUND", "Menu item not found");
};

const menuItemNotAvailable = (reply: FastifyReply) => {
  return conflict(
    reply,
    "MENU_ITEM_NOT_AVAILABLE",
    "One or more menu items are not available",
  );
};

const orderPaymentNotRefunded = (reply: FastifyReply) => {
  return conflict(
    reply,
    "ORDER_PAYMENT_NOT_REFUNDED",
    "All payments must be fully refunded before cancelling the order",
  );
};

const invalidStatusTransition = (reply: FastifyReply) => {
  return conflict(
    reply,
    "INVALID_ORDER_STATUS_TRANSITION",
    "The order cannot transition to the requested status",
  );
};

const orderNotEditable = (reply: FastifyReply) => {
  return conflict(
    reply,
    "ORDER_NOT_EDITABLE",
    "Only pending orders can be edited",
  );
};

export const createOrderController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const input = createOrderSchema.parse(request.body);

    const result = await ordersService.createOrder({
      ...input,
      restaurantId: request.user.restaurantId,
      createdBy: request.user.sub,
    });

    if (result.status === "menu_item_not_found") {
      return menuItemNotFound(reply);
    }

    if (result.status === "menu_item_not_available") {
      return menuItemNotAvailable(reply);
    }

    return reply.status(201).send({
      order: result.order,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(reply, error);
    }

    throw error;
  }
};

export const getOrdersController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const orders = await ordersService.getOrders({
    restaurantId: request.user.restaurantId,
  });

  return reply.status(200).send({ orders });
};

export const getOrderByIdController = async (
  request: FastifyRequest<{ Params: OrderParams }>,
  reply: FastifyReply,
) => {
  const order = await ordersService.getOrderById({
    orderId: request.params.id,
    restaurantId: request.user.restaurantId,
  });

  if (!order) {
    return orderNotFound(reply);
  }

  return reply.status(200).send({ order });
};

export const updateOrderController = async (
  request: FastifyRequest<{ Params: OrderParams }>,
  reply: FastifyReply,
) => {
  try {
    const input = updateOrderSchema.parse(request.body);

    const result = await ordersService.updateOrder({
      ...input,
      orderId: request.params.id,
      restaurantId: request.user.restaurantId,
    });

    if (result.status === "not_found") {
      return orderNotFound(reply);
    }

    if (result.status === "not_editable") {
      return orderNotEditable(reply);
    }

    if (result.status === "menu_item_not_found") {
      return menuItemNotFound(reply);
    }

    if (result.status === "menu_item_not_available") {
      return menuItemNotAvailable(reply);
    }

    return reply.status(200).send({
      message: "Order updated successfully",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(reply, error);
    }

    throw error;
  }
};

export const updateOrderStatusController = async (
  request: FastifyRequest<{ Params: OrderParams }>,
  reply: FastifyReply,
) => {
  try {
    const input = updateOrderStatusSchema.parse(request.body);

    const result = await ordersService.updateOrderStatus({
      ...input,
      orderId: request.params.id,
      restaurantId: request.user.restaurantId,
    });

    if (result.status === "not_found") {
      return orderNotFound(reply);
    }

    if (result.status === "payment_not_refunded") {
      return orderPaymentNotRefunded(reply);
    }

    if (result.status === "invalid_transition") {
      return invalidStatusTransition(reply);
    }

    return reply.status(200).send({
      order: result.order,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(reply, error);
    }

    throw error;
  }
};
