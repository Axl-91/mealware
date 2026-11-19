import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../auth/authenticate.js";
import {
  getDashboardChartsController,
  getDashboardSummaryController,
} from "../controllers/dashboard.controller.js";

const dashboardChartsQuerySchema = z.object({
  period: z.enum(["7d", "30d"]),
});

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  const api = app.withTypeProvider<ZodTypeProvider>();

  // GET /dashboard/summary - Get dashboard summary (ADMIN and EMPLOYEE)
  api.get(
    "/summary",
    { preHandler: [authenticate] },
    getDashboardSummaryController,
  );

  // GET /dashboard/charts - Get dashboard charts (ADMIN and EMPLOYEE)
  api.get(
    "/charts",
    {
      preHandler: [authenticate],
      schema: {
        querystring: dashboardChartsQuerySchema,
      },
    },
    getDashboardChartsController,
  );
};
