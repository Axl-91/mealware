import { z } from "zod";

export const dashboardChartsQuerySchema = z.object({
  period: z.enum(["7d", "30d"]),
});

export type DashboardChartsQuery = z.infer<typeof dashboardChartsQuerySchema>;
