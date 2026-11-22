import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
import type { DashboardOrdersByStatus } from "../../api/dashboard-api";

interface OrdersByStatusChartProps {
  data?: DashboardOrdersByStatus[];
  isLoading: boolean;
}

const STATUS_LABELS: Record<DashboardOrdersByStatus["status"], string> = {
  PENDING: "Pendientes",
  PREPARING: "En preparación",
  READY: "Listos",
  COMPLETED: "Completados",
  CANCELLED: "Cancelados",
};

const chartConfig = {
  total: {
    label: "Pedidos",
    color: "#7c3aed",
  },
} satisfies ChartConfig;

export function OrdersByStatusChart({
  data,
  isLoading,
}: OrdersByStatusChartProps) {
  const chartData = (data ?? []).map((item) => ({
    status: item.status,
    label: STATUS_LABELS[item.status],
    total: item.total,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos por estado</CardTitle>
        <CardDescription>
          Distribución de pedidos según su estado actual.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid horizontal={false} />

              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={110}
              />

              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />

              <Bar
                dataKey="total"
                fill="var(--color-total)"
                radius={[0, 4, 4, 0]}
                barSize={24}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
