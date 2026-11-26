import type { FastifyPluginAsync } from "fastify";
import { PAYMENTS_ROLES, REFUNDS_ROLES } from "@mealware/shared";
import { authenticate } from "../auth/authenticate.js";
import { authorize } from "../auth/authorize.js";
import {
  createPaymentController,
  getPaymentsByOrderController,
  createRefundController,
  getRefundsByPaymentController,
  getPaymentsController,
} from "../controllers/payments.controller.js";

export const paymentsRoutes: FastifyPluginAsync = async (app) => {
  const paymentsAccess = {
    preHandler: [authenticate, authorize(...PAYMENTS_ROLES)],
  };

  const refundsAccess = {
    preHandler: [authenticate, authorize(...REFUNDS_ROLES)],
  };

  // GET /payments - List payment movements (ADMIN and EMPLOYEE)
  app.get("/payments", paymentsAccess, getPaymentsController);

  // POST /orders/:id/payments - Create payment (ADMIN and EMPLOYEE)
  app.post<{ Params: { id: string } }>(
    "/orders/:id/payments",
    paymentsAccess,
    createPaymentController,
  );

  // GET /orders/:id/payments - List order payments (ADMIN and EMPLOYEE)
  app.get<{ Params: { id: string } }>(
    "/orders/:id/payments",
    paymentsAccess,
    getPaymentsByOrderController,
  );

  // POST /payments/:id/refunds - Create refund (ADMIN only)
  app.post<{ Params: { id: string } }>(
    "/payments/:id/refunds",
    refundsAccess,
    createRefundController,
  );

  // GET /payments/:id/refunds - List payment refunds (ADMIN only)
  app.get<{ Params: { id: string } }>(
    "/payments/:id/refunds",
    refundsAccess,
    getRefundsByPaymentController,
  );
};
