import { ORDER_STATUSES, ORDER_TYPES, PAYMENT_METHODS } from "@mealware/shared";
import * as dashboardRepository from "../repositories/dashboard.repository.js";

interface GetDashboardSummaryServiceInput {
  restaurantId: string;
}

interface GetDashboardChartsServiceInput {
  restaurantId: string;
  period: "7d" | "30d";
}

/**
 * Retrieves the current date in Argentina's timezone.
 */
const getArgentinaCurrentDate = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")!.value;
  const month = parts.find((part) => part.type === "month")!.value;
  const day = parts.find((part) => part.type === "day")!.value;

  return `${year}-${month}-${day}`;
};

/**
 * Generates all dates included in the selected period.
 */
const getPeriodDates = (days: 7 | 30) => {
  const currentDate = getArgentinaCurrentDate();
  const date = new Date(`${currentDate}T00:00:00.000Z`);

  return Array.from({ length: days }, (_, index) => {
    const periodDate = new Date(date);
    periodDate.setUTCDate(date.getUTCDate() - (days - index - 1));

    return periodDate.toISOString().slice(0, 10);
  });
};

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

/**
 * Retrieves dashboard chart data and fills missing categories with zero values.
 */
export const getDashboardCharts = async ({
  restaurantId,
  period,
}: GetDashboardChartsServiceInput) => {
  const days = period === "7d" ? 7 : 30;

  const charts = await dashboardRepository.getDashboardCharts({
    restaurantId,
    days,
  });

  const dates = getPeriodDates(days);

  const sales = dates.map((date) => ({
    date,
    total: charts.sales.find((item) => item.date === date)?.total ?? "0.00",
  }));

  const ordersByStatus = Object.values(ORDER_STATUSES).map((status) => ({
    status,
    total:
      charts.ordersByStatus.find((item) => item.status === status)?.total ?? 0,
  }));

  const salesByPaymentMethod = PAYMENT_METHODS.map((method) => ({
    method,
    total:
      charts.salesByPaymentMethod.find((item) => item.method === method)
        ?.total ?? "0.00",
  }));

  const ordersByType = Object.values(ORDER_TYPES).map((type) => ({
    type,
    total: charts.ordersByType.find((item) => item.type === type)?.total ?? 0,
  }));

  return {
    sales,
    ordersByStatus,
    salesByPaymentMethod,
    ordersByType,
  };
};
