import { useQuery } from "@tanstack/react-query";
import {
  getDashboardCharts,
  getDashboardSummary,
  type DashboardChartsPeriod,
} from "../api/dashboard-api";

export const DASHBOARD_SUMMARY_QUERY_KEY = ["dashboard", "summary"];

export const DASHBOARD_CHARTS_QUERY_KEY = ["dashboard", "charts"];

export const useDashboardSummary = () =>
  useQuery({
    queryKey: DASHBOARD_SUMMARY_QUERY_KEY,
    queryFn: getDashboardSummary,
  });

export const useDashboardCharts = (period: DashboardChartsPeriod) =>
  useQuery({
    queryKey: [...DASHBOARD_CHARTS_QUERY_KEY, period],
    queryFn: () => getDashboardCharts(period),
  });
