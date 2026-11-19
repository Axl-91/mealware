import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardCharts } from "../hooks/use-dashboard";
import type { DashboardChartsPeriod } from "../api/dashboard-api";
import { SalesChart } from "./charts/sales-chart";
import { OrdersByStatusChart } from "./charts/orders-by-status-chart";
import { SalesByPaymentMethodChart } from "./charts/sales-by-payment-method-chart";
import { OrdersByTypeChart } from "./charts/orders-by-type-chart";

export function DashboardCharts() {
  const [period, setPeriod] = useState<DashboardChartsPeriod>("7d");

  const { data, isPending, isError, refetch, isFetching } =
    useDashboardCharts(period);

  const charts = data?.charts;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Estadísticas
          </h2>
          <p className="text-sm text-muted-foreground">
            Resumen de actividad y ventas del restaurante.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={period === "7d" ? "default" : "outline"}
            onClick={() => setPeriod("7d")}
          >
            Últimos 7 días
          </Button>

          <Button
            type="button"
            size="sm"
            variant={period === "30d" ? "default" : "outline"}
            onClick={() => setPeriod("30d")}
          >
            Últimos 30 días
          </Button>
        </div>
      </div>

      {isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-destructive">
              No se pudieron cargar los gráficos.
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : isPending ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 pt-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-[280px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <SalesChart data={charts?.sales} isLoading={false} />

          <OrdersByStatusChart
            data={charts?.ordersByStatus}
            isLoading={false}
          />

          <SalesByPaymentMethodChart
            data={charts?.salesByPaymentMethod}
            isLoading={false}
          />

          <OrdersByTypeChart
            data={charts?.ordersByType}
            isLoading={false}
          />
        </div>
      )}
    </section>
  );
}
