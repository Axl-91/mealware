import {
  Area,
  AreaChart,
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
import type { DashboardSalesByDay } from "../../api/dashboard-api";

interface SalesChartProps {
  data?: DashboardSalesByDay[];
  isLoading: boolean;
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

const chartConfig = {
  total: {
    label: "Ventas",
    color: "#2563eb",
  },
} satisfies ChartConfig;

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00`));
}

export function SalesChart({ data, isLoading }: SalesChartProps) {
  const chartData = (data ?? []).map((item) => ({
    date: item.date,
    total: Number(item.total),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por día</CardTitle>
        <CardDescription>
          Evolución de las ventas netas durante el período seleccionado.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 12, right: 12, top: 12 }}
            >
              <CartesianGrid vertical={false} />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatDate}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={80}
                tickFormatter={(value: number) =>
                  compactCurrencyFormatter.format(value)
                }
              />

              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value: React.ReactNode) =>
                      typeof value === "string" || typeof value === "number"
                        ? formatDate(String(value))
                        : ""
                    }
                    formatter={(value: unknown) =>
                      currencyFormatter.format(Number(value ?? 0))
                    }
                  />
                }
              />

              <Area
                dataKey="total"
                type="monotone"
                fill="var(--color-total)"
                fillOpacity={0.2}
                stroke="var(--color-total)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
