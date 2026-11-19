import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../auth/authenticate.js";
import { getDashboardSummaryController } from "../controllers/dashboard.controller.js";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  // GET /dashboard/summary - Get dashboard summary (ADMIN and EMPLOYEE)
  app.get(
    "/summary",
    { preHandler: [authenticate] },
    getDashboardSummaryController,
  );
};
