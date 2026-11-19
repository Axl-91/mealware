import * as dashboardRepository from "../repositories/dashboard.repository.js";

interface GetDashboardSummaryServiceInput {
  restaurantId: string;
}

/**
 * Retrieves dashboard metrics and calculates derived financial indicators.
 */
export const getDashboardSummary = async ({
  restaurantId,
}: GetDashboardSummaryServiceInput) => {
  const summary = await dashboardRepository.getDashboardSummary({
    restaurantId,
  });

  const netSalesToday =
    Number(summary.paymentsToday) - Number(summary.refundsToday);

  const averageTicket =
    summary.paidOrdersToday > 0 ? netSalesToday / summary.paidOrdersToday : 0;

  return {
    netSalesToday: netSalesToday.toFixed(2),
    ordersToday: summary.ordersToday,
    averageTicket: averageTicket.toFixed(2),
    pendingOrders: summary.pendingOrders,
  };
};
