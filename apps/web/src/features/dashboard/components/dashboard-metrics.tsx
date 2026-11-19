import {
  Clock3,
  DollarSign,
  ShoppingBag,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSummary } from "../api/dashboard-api";

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  isLoading: boolean;
}

interface DashboardMetricsProps {
  summary?: DashboardSummary;
  isLoading: boolean;
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <div className="text-2xl font-bold tracking-tight">{value}</div>
        )}

        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardMetrics({
  summary,
  isLoading,
}: DashboardMetricsProps) {
  const metrics = [
    {
      title: "Ventas de hoy",
      value: summary
        ? currencyFormatter.format(Number(summary.netSalesToday))
        : "$0",
      description: "Ingresos netos registrados hoy",
      icon: DollarSign,
    },
    {
      title: "Pedidos de hoy",
      value: summary?.ordersToday.toString() ?? "0",
      description: "Pedidos creados durante el día",
      icon: ShoppingBag,
    },
    {
      title: "Ticket promedio",
      value: summary
        ? currencyFormatter.format(Number(summary.averageTicket))
        : "$0",
      description: "Promedio por pedido con pagos hoy",
      icon: Ticket,
    },
    {
      title: "Pedidos pendientes",
      value: summary?.pendingOrders.toString() ?? "0",
      description: "Pedidos que requieren atención",
      icon: Clock3,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.title}
          {...metric}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
