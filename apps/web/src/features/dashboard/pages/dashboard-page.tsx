import {
  Clock3,
  DollarSign,
  ShoppingBag,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useDashboardSummary } from "../hooks/use-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
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

function DashboardPage() {
  const { data: authData } = useAuth();
  const { data, isPending, isError, refetch, isFetching } =
    useDashboardSummary();

  const summary = data?.summary;

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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Bienvenido, {authData?.user.name}
      </h1>

      {isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-destructive">
            No se pudieron cargar los datos del Dashboard.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              {...metric}
              isLoading={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
