import { useState } from "react";
import { usePayments } from "../hooks/use-payments";
import {
  type PaymentMethod,
  type PaymentPeriod,
} from "../api/payments-api";
import { PaymentMovementsTable } from "../components/payment-movements-table";
import OrderDetailDialog from "@/features/orders/components/order-detail-dialog";
import {
  formatCurrency,
} from "@/features/orders/utils/order-detail-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 10;

const periodLabels: Record<PaymentPeriod, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  last_7_days: "Últimos 7 días",
  last_30_days: "Últimos 30 días",
  all: "Todos",
};

const methodLabels: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  DEBIT_CARD: "Tarjeta de débito",
  CREDIT_CARD: "Tarjeta de crédito",
  TRANSFER: "Transferencia",
};

export default function PaymentsPage() {
  const [period, setPeriod] = useState<PaymentPeriod>("today");
  const [method, setMethod] = useState<PaymentMethod | "all">("all");
  const [orderNumber, setOrderNumber] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const parsedOrderNumber = Number(orderNumber);

  const {
    data,
    isPending,
    isError,
    isFetching,
    refetch,
  } = usePayments({
    page,
    limit: PAGE_SIZE,
    period,
    ...(method !== "all" ? { method } : {}),
    ...(orderNumber.trim() && Number.isInteger(parsedOrderNumber) && parsedOrderNumber > 0
      ? { orderNumber: parsedOrderNumber }
      : {}),
  });

  const handlePeriodChange = (value: string) => {
    setPeriod(value as PaymentPeriod);
    setPage(1);
  };

  const handleMethodChange = (value: string) => {
    setMethod(value as PaymentMethod | "all");
    setPage(1);
  };

  const handleOrderNumberChange = (value: string) => {
    setOrderNumber(value.replace(/\D/g, ""));
    setPage(1);
  };

  const summary = data?.summary;
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Consultá los cobros y devoluciones del restaurante.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total recibido</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {summary ? formatCurrency(summary.totalReceived) : "—"}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total reembolsado</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
            {summary ? formatCurrency(summary.totalRefunded) : "—"}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Neto</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {summary ? formatCurrency(summary.netTotal) : "—"}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(periodLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={method} onValueChange={handleMethodChange}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Método de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los métodos</SelectItem>
            {Object.entries(methodLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          inputMode="numeric"
          placeholder="Número de orden"
          value={orderNumber}
          onChange={(event) => handleOrderNumberChange(event.target.value)}
          className="w-full sm:max-w-[200px]"
        />
      </section>

      {isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-destructive">
            No se pudieron cargar los movimientos.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          <PaymentMovementsTable
            movements={data?.movements ?? []}
            isLoading={isPending}
            onOrderClick={setSelectedOrderId}
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages} ·{" "}
                {pagination.total} movimientos
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Anterior
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages || isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <OrderDetailDialog
        orderId={selectedOrderId}
        open={selectedOrderId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
      />
    </div>
  );
}
