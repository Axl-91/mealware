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
import type { DashboardSalesByPaymentMethod } from "../../api/dashboard-api";

interface SalesByPaymentMethodChartProps {
  data?: DashboardSalesByPaymentMethod[];
  isLoading: boolean;
}

const PAYMENT_METHOD_LABELS: Record<
  DashboardSalesByPaymentMethod["method"],
  string
> = {
  CASH: "Efectivo",
  DEBIT_CARD: "Débito",
  CREDIT_CARD: "Crédito",
  TRANSFER: "Transferencia",
};

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

const chartConfig = {
  total: {
    label: "Ventas",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function SalesByPaymentMethodChart({
  data,
  isLoading,
}: SalesByPaymentMethodChartProps) {
  const chartData = (data ?? []).map((item) => ({
    method: item.method,
    label: PAYMENT_METHOD_LABELS[item.method],
    total: Number(item.total),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por medio de pago</CardTitle>
        <CardDescription>
          Distribución de ventas netas según el medio de pago.
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
              margin={{ left: 12, right: 12, top: 12 }}
            >
              <CartesianGrid vertical={false} />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
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
                    formatter={(value: unknown) =>
                      currencyFormatter.format(Number(value ?? 0))
                    }
                  />
                }
              />

              <Bar
                dataKey="total"
                fill="var(--color-total)"
                radius={[4, 4, 0, 0]}
                barSize={48}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
