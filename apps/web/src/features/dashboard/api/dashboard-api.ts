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

export const getDashboardSummary = () =>
  apiRequest<DashboardSummaryResponse>("/dashboard/summary");
