import type {
  CreateOrderInput,
  UpdateOrderInput,
  UpdateOrderStatusInput,
} from "@mealware/shared";
import type { OrderStatus } from "../database/types/orders.js";
import * as ordersRepository from "../repositories/orders.repository.js";

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

interface CreateOrderServiceInput extends CreateOrderInput {
  restaurantId: string;
  createdBy: string;
}

interface GetOrdersServiceInput {
  restaurantId: string;
}

interface GetOrderByIdServiceInput {
  orderId: string;
  restaurantId: string;
}

interface UpdateOrderServiceInput extends UpdateOrderInput {
  orderId: string;
  restaurantId: string;
}

interface UpdateOrderStatusServiceInput extends UpdateOrderStatusInput {
  orderId: string;
  restaurantId: string;
}

export const createOrder = async ({
  restaurantId,
  createdBy,
  ...input
}: CreateOrderServiceInput) => {
  return ordersRepository.createOrder({
    restaurantId,
    createdBy,
    ...input,
  });
};

export const getOrders = async ({ restaurantId }: GetOrdersServiceInput) => {
  return ordersRepository.getOrders({ restaurantId });
};

export const getOrderById = async ({
  orderId,
  restaurantId,
}: GetOrderByIdServiceInput) => {
  return ordersRepository.getOrderById({
    orderId,
    restaurantId,
  });
};

export const updateOrder = async ({
  orderId,
  restaurantId,
  ...input
}: UpdateOrderServiceInput) => {
  return ordersRepository.updateOrder({
    orderId,
    restaurantId,
    ...input,
  });
};

export const updateOrderStatus = async ({
  orderId,
  restaurantId,
  status,
}: UpdateOrderStatusServiceInput) => {
  return ordersRepository.updateOrderStatus({
    orderId,
    restaurantId,
    status,
    validateTransition: (currentStatus) =>
      allowedTransitions[currentStatus].includes(status),
  });
};
