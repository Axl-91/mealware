import { Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardOrdersByType } from "../../api/dashboard-api";

interface OrdersByTypeChartProps {
  data?: DashboardOrdersByType[];
  isLoading: boolean;
}

const chartConfig = {
  dineIn: {
    label: "En el local",
    color: "#2563eb",
  },
  takeaway: {
    label: "Para llevar",
    color: "#8b5cf6",
  },
} satisfies ChartConfig;

export function OrdersByTypeChart({
  data,
  isLoading,
}: OrdersByTypeChartProps) {
  const chartData = (data ?? []).map((item) => ({
    type: item.type === "DINE_IN" ? "dineIn" : "takeaway",
    total: item.total,
    fill:
      item.type === "DINE_IN"
        ? "var(--color-dineIn)"
        : "var(--color-takeaway)",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos por tipo</CardTitle>
        <CardDescription>
          Distribución de pedidos según su modalidad.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto h-[280px] w-full"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent nameKey="type" />}
              />

              <Pie
                data={chartData}
                dataKey="total"
                nameKey="type"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                strokeWidth={2}
              />

              <ChartLegend
                content={<ChartLegendContent nameKey="type" />}
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
