import type {
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
} from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { dashboardChartsQuerySchema } from "../schemas/dashboard.schema.js";
import * as dashboardService from "../services/dashboard.service.js";

/**
 * Handles requests for the authenticated restaurant's dashboard summary.
 */
export const getDashboardSummaryController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const summary = await dashboardService.getDashboardSummary({
    restaurantId: request.user.restaurantId,
  });

  return reply.status(200).send({ summary });
};

/**
 * Handles requests for the authenticated restaurant's dashboard charts.
 */
export const getDashboardChartsController = async (
  request: FastifyRequest<
    RouteGenericInterface,
    RawServerDefault,
    RawRequestDefaultExpression<RawServerDefault>,
    FastifySchema,
    ZodTypeProvider
  >,
  reply: FastifyReply,
) => {
  const { period } = dashboardChartsQuerySchema.parse(request.query);

  const charts = await dashboardService.getDashboardCharts({
    restaurantId: request.user.restaurantId,
    period,
  });

  return reply.status(200).send({ charts });
};
