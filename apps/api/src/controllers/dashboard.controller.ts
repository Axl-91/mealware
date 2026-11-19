import type { FastifyReply, FastifyRequest } from "fastify";
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
