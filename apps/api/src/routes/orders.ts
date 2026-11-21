import type { FastifyPluginAsync } from "fastify";
import {
  ORDERS_CREATE_ROLES,
  ORDERS_READ_ROLES,
  ORDERS_UPDATE_ROLES,
  ORDERS_STATUS_UPDATE_ROLES,
} from "@mealware/shared";
import { authenticate } from "../auth/authenticate.js";
import { authorize } from "../auth/authorize.js";
import {
  createOrderController,
  getOrdersController,
  getOrderByIdController,
  updateOrderController,
  updateOrderStatusController,
} from "../controllers/orders.controller.js";

export const ordersRoutes: FastifyPluginAsync = async (app) => {
  const createAccess = {
    preHandler: [authenticate, authorize(...ORDERS_CREATE_ROLES)],
  };

  const readAccess = {
    preHandler: [authenticate, authorize(...ORDERS_READ_ROLES)],
  };

  const updateAccess = {
    preHandler: [authenticate, authorize(...ORDERS_UPDATE_ROLES)],
  };

  const statusUpdateAccess = {
    preHandler: [authenticate, authorize(...ORDERS_STATUS_UPDATE_ROLES)],
  };

  // POST /orders - Create order
  app.post("/", createAccess, createOrderController);

  // GET /orders - List orders
  app.get("/", readAccess, getOrdersController);

  // GET /orders/:id - Get order by ID
  app.get<{ Params: { id: string } }>(
    "/:id",
    readAccess,
    getOrderByIdController,
  );

  // PUT /orders/:id - Update order
  app.put<{ Params: { id: string } }>(
    "/:id",
    updateAccess,
    updateOrderController,
  );

  // PUT /orders/:id/status - Update order status
  app.put<{ Params: { id: string } }>(
    "/:id/status",
    statusUpdateAccess,
    updateOrderStatusController,
  );
};
