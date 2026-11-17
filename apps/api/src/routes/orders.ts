import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../auth/authenticate.js";
import {
  createOrderController,
  getOrdersController,
  getOrderByIdController,
  updateOrderController,
  updateOrderStatusController,
} from "../controllers/orders.controller.js";

export const ordersRoutes: FastifyPluginAsync = async (app) => {
  const authenticated = { preHandler: [authenticate] };

  // POST /orders - Create order (ADMIN and EMPLOYEE)
  app.post("/", authenticated, createOrderController);

  // GET /orders - List orders (ADMIN and EMPLOYEE)
  app.get("/", authenticated, getOrdersController);

  // GET /orders/:id - Get order by ID (ADMIN and EMPLOYEE)
  app.get<{ Params: { id: string } }>(
    "/:id",
    authenticated,
    getOrderByIdController,
  );

  // PUT /orders/:id - Update order (ADMIN and EMPLOYEE)
  app.put<{ Params: { id: string } }>(
    "/:id",
    authenticated,
    updateOrderController,
  );

  // PUT /orders/:id/status - Update order status (ADMIN and EMPLOYEE)
  app.put<{ Params: { id: string } }>(
    "/:id/status",
    authenticated,
    updateOrderStatusController,
  );
};
