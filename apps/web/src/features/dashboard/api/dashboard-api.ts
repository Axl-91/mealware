import { ORDER_STATUSES, ORDER_TYPES, PAYMENT_METHODS } from "@mealware/shared";
import { apiRequest } from "@/lib/api";

export interface DashboardSummary {
  netSalesToday: string;
  ordersToday: number;
  averageTicket: string;
  pendingOrders: number;
}

export interface DashboardSummaryResponse {
  summary: DashboardSummary;
}

export type DashboardChartsPeriod = "7d" | "30d";

export type DashboardOrderStatus =
  (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export type DashboardOrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

export type DashboardPaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface DashboardSalesByDay {
  date: string;
  total: string;
}

export interface DashboardOrdersByStatus {
  status: DashboardOrderStatus;
  total: number;
}

export interface DashboardSalesByPaymentMethod {
  method: DashboardPaymentMethod;
  total: string;
}

export interface DashboardOrdersByType {
  type: DashboardOrderType;
  total: number;
}

export interface DashboardCharts {
  sales: DashboardSalesByDay[];
  ordersByStatus: DashboardOrdersByStatus[];
  salesByPaymentMethod: DashboardSalesByPaymentMethod[];
  ordersByType: DashboardOrdersByType[];
}

export interface DashboardChartsResponse {
  charts: DashboardCharts;
}

export const getDashboardSummary = () =>
  apiRequest<DashboardSummaryResponse>("/dashboard/summary");

export const getDashboardCharts = (period: DashboardChartsPeriod) =>
  apiRequest<DashboardChartsResponse>(`/dashboard/charts?period=${period}`);
