import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OrderStatus } from "../api/orders-api";
import { useOrder } from "../hooks/use-order";
import { useUpdateOrderStatus } from "../hooks/use-orders";

interface OrderDetailDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const orderTypeLabels = {
  DINE_IN: "En el local",
  TAKEAWAY: "Para llevar",
} as const;

const orderStatusConfig = {
  PENDING: {
    label: "Pendiente",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  PREPARING: {
    label: "Preparando",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  READY: {
    label: "Lista",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  COMPLETED: {
    label: "Completada",
    className:
      "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  CANCELLED: {
    label: "Cancelada",
    className:
      "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
} as const;

const paymentMethodLabels = {
  CASH: "Efectivo",
  DEBIT_CARD: "Tarjeta de débito",
  CREDIT_CARD: "Tarjeta de crédito",
  TRANSFER: "Transferencia",
} as const;

const paymentStatusConfig = {
  UNPAID: {
    label: "Sin pagar",
    className:
      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  PARTIALLY_PAID: {
    label: "Pago parcial",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  PAID: {
    label: "Pagada",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
} as const;

const nextOrderStatus: Partial<
  Record<OrderStatus, { status: OrderStatus; label: string }>
> = {
  PENDING: {
    status: "PREPARING",
    label: "Comenzar preparación",
  },
  PREPARING: {
    status: "READY",
    label: "Marcar como lista",
  },
  READY: {
    status: "COMPLETED",
    label: "Completar pedido",
  },
};

const cancellableStatuses: OrderStatus[] = [
  "PENDING",
  "PREPARING",
  "READY",
];

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OrderDetailDialog({
  orderId,
  open,
  onOpenChange,
}: OrderDetailDialogProps) {
  const { data: order, isPending, isError, refetch } = useOrder(
    open ? orderId : null,
  );

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const updateStatus = useUpdateOrderStatus();

  useEffect(() => {
    updateStatus.reset();
  }, [orderId, open, updateStatus.reset]);

  const totals = useMemo(() => {
    if (!order) {
      return { paid: 0, refunded: 0, outstanding: 0 };
    }

    const paid = order.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    const refunded = order.payments.reduce(
      (sum, payment) =>
        sum +
        payment.refunds.reduce(
          (refundSum, refund) => refundSum + Number(refund.amount),
          0,
        ),
      0,
    );

    const outstanding = Math.max(
      Number(order.total) - (paid - refunded),
      0,
    );

    return { paid, refunded, outstanding };
  }, [order]);

  const movements = useMemo(() => {
    if (!order) return [];

    return order.payments
      .flatMap((payment) => [
        {
          id: payment.id,
          type: "PAYMENT" as const,
          amount: Number(payment.amount),
          method: payment.method,
          createdAt: payment.created_at,
        },
        ...payment.refunds.map((refund) => ({
          id: refund.id,
          type: "REFUND" as const,
          amount: Number(refund.amount),
          method: payment.method,
          createdAt: refund.created_at,
        })),
      ])
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime(),
      );
  }, [order]);

  const nextStatus = order
    ? nextOrderStatus[order.status]
    : undefined;

  const canCancel = order
    ? cancellableStatuses.includes(order.status)
    : false;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {order
                ? `Pedido #${order.order_number}`
                : "Detalle del pedido"}
            </DialogTitle>
          </DialogHeader>

          {updateStatus.isError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {updateStatus.error instanceof Error
                ? updateStatus.error.message
                : "No se pudo actualizar el pedido."}
            </div>
          )}

          {isPending && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Cargando pedido...
            </p>
          )}

          {isError && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-destructive">
                No se pudo cargar el pedido.
              </p>

              <button
                type="button"
                onClick={() => refetch()}
                className="text-sm font-medium underline underline-offset-4"
              >
                Reintentar
              </button>
            </div>
          )}

          {order && (
            <div className="space-y-6">
              {/* Información general */}
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-3">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {orderTypeLabels[order.type]}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${orderStatusConfig[order.status].className}`}
                >
                  {orderStatusConfig[order.status].label}
                </span>

                <span className="text-xs text-muted-foreground">
                  {formatDateTime(order.created_at)}
                </span>

                {order.customer_name && (
                  <span className="text-sm font-medium">
                    {order.customer_name}
                  </span>
                )}
              </div>

              {/* Productos */}
              <section className="space-y-3">
                <h3 className="border-l-4 border-blue-500 pl-3 font-semibold">
                  Productos
                </h3>

                <div className="divide-y rounded-lg border">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {item.quantity} × {item.name}
                        </p>

                        {item.notes && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.notes}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatCurrency(item.unit_price)} c/u
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatCurrency(
                          Number(item.unit_price) * item.quantity,
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                      Notas del pedido
                    </p>
                    <p className="mt-1 text-sm">{order.notes}</p>
                  </div>
                )}

                <div className="flex justify-between rounded-lg bg-muted/50 p-3">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </section>

              {/* Resumen de pago */}
              <section className="space-y-3">
                <h3 className="border-l-4 border-emerald-500 pl-3 font-semibold">
                  Resumen de pago
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Total
                    </p>
                    <p className="mt-1 font-bold tabular-nums">
                      {formatCurrency(order.total)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Pagado
                    </p>
                    <p className="mt-1 font-bold tabular-nums">
                      {formatCurrency(totals.paid)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
                    <p className="text-xs font-medium text-red-700 dark:text-red-300">
                      Devuelto
                    </p>
                    <p className="mt-1 font-bold tabular-nums">
                      {formatCurrency(totals.refunded)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Pendiente
                    </p>
                    <p className="mt-1 font-bold tabular-nums">
                      {formatCurrency(totals.outstanding)}
                    </p>
                  </div>
                </div>

                {order.payment_status && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                    <span className="text-sm text-muted-foreground">
                      Estado del pago
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusConfig[order.payment_status].className}`}
                    >
                      {paymentStatusConfig[order.payment_status].label}
                    </span>
                  </div>
                )}
              </section>

              {/* Movimientos */}
              <section className="space-y-3">
                <h3 className="border-l-4 border-violet-500 pl-3 font-semibold">
                  Movimientos
                </h3>

                {movements.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Todavía no hay movimientos registrados.
                  </p>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {movements.map((movement) => (
                      <div
                        key={movement.id}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {movement.type === "PAYMENT"
                              ? "Pago registrado"
                              : "Devolución registrada"}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {paymentMethodLabels[movement.method]} ·{" "}
                            {formatDateTime(movement.createdAt)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 text-sm font-bold tabular-nums ${movement.type === "REFUND"
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                            }`}
                        >
                          {movement.type === "REFUND" ? "−" : "+"}
                          {formatCurrency(movement.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Acciones */}
              {(nextStatus || canCancel) && (
                <section className="flex flex-wrap justify-end gap-2 border-t pt-4">
                  {canCancel && (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={updateStatus.isPending}
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      Cancelar pedido
                    </Button>
                  )}

                  {nextStatus && (
                    <Button
                      type="button"
                      disabled={updateStatus.isPending}
                      onClick={() =>
                        updateStatus.mutate({
                          orderId: order.id,
                          status: nextStatus.status,
                        })
                      }
                    >
                      {updateStatus.isPending
                        ? "Actualizando..."
                        : nextStatus.label}
                    </Button>
                  )}
                </section>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Cancelar el pedido?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Esta acción cancelará el pedido #{order?.order_number}.
              No podrás volver a modificarlo. Si tiene pagos registrados,
              primero deberán devolverse completamente.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatus.isPending}>
              Volver
            </AlertDialogCancel>

            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={updateStatus.isPending}
              onClick={() => {
                if (!order) return;

                setCancelDialogOpen(false);

                updateStatus.mutate({
                  orderId: order.id,
                  status: "CANCELLED",
                });
              }}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
