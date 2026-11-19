import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "../api/dashboard-api";

export const DASHBOARD_SUMMARY_QUERY_KEY = ["dashboard", "summary"];

export const useDashboardSummary = () =>
  useQuery({
    queryKey: DASHBOARD_SUMMARY_QUERY_KEY,
    queryFn: getDashboardSummary,
  });
