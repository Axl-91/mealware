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
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useOrder } from "../hooks/use-order";
import { useUpdateOrderStatus } from "../hooks/use-orders";
import {
  calculateOrderPaymentTotals,
  cancellableStatuses,
  hasRefundablePayments,
  nextOrderStatus,
} from "../utils/order-detail-utils";
import OrderDetailProducts from "./order-detail-products";
import OrderMovements from "./order-movements";
import OrderPaymentSummary from "./order-payment-summary";
import RegisterPaymentDialog from "./register-payment-dialog";
import RegisterRefundDialog from "./register-refund-dialog";

interface OrderDetailDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderDetailDialog({
  orderId,
  open,
  onOpenChange,
}: OrderDetailDialogProps) {
  const {
    data: order,
    isPending,
    isError,
    refetch,
  } = useOrder(open ? orderId : null);

  const { data: auth } = useAuth();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);

  const updateStatus = useUpdateOrderStatus();

  useEffect(() => {
    updateStatus.reset();
  }, [orderId, open, updateStatus.reset]);

  const totals = useMemo(
    () =>
      order
        ? calculateOrderPaymentTotals(order)
        : { paid: 0, refunded: 0, outstanding: 0 },
    [order],
  );

  const nextStatus = order
    ? nextOrderStatus[order.status]
    : undefined;

  const canCancel = order
    ? cancellableStatuses.includes(order.status)
    : false;

  const canRegisterPayment =
    order !== undefined &&
    (order.status === "READY" || order.status === "COMPLETED") &&
    totals.outstanding > 0;

  const isAdmin = auth?.user.role === "ADMIN";

  const canRegisterRefund =
    order !== undefined &&
    isAdmin &&
    hasRefundablePayments(order.payments);

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
              <OrderDetailProducts order={order} />

              <OrderPaymentSummary
                order={order}
                totals={totals}
              />

              <OrderMovements payments={order.payments} />

              {/* Acciones del pedido */}
              {(canRegisterPayment ||
                canRegisterRefund ||
                nextStatus ||
                canCancel) && (
                  <section className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    {/* Acciones de pago */}
                    <div className="flex flex-wrap gap-2">
                      {canRegisterPayment && (
                        <Button
                          type="button"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => setPaymentDialogOpen(true)}
                        >
                          Registrar pago
                        </Button>
                      )}

                      {canRegisterRefund && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => setRefundDialogOpen(true)}
                        >
                          Registrar devolución
                        </Button>
                      )}
                    </div>

                    {/* Acciones de estado */}
                    <div className="flex flex-wrap justify-end gap-2">
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
                    </div>
                  </section>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación de cancelación */}
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

      {/* Diálogos de pago y devolución */}
      {order && (
        <>
          <RegisterPaymentDialog
            orderId={order.id}
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            total={Number(order.total)}
            paid={Math.max(totals.paid - totals.refunded, 0)}
            outstanding={totals.outstanding}
          />

          <RegisterRefundDialog
            orderId={order.id}
            payments={order.payments}
            open={refundDialogOpen}
            onOpenChange={setRefundDialogOpen}
          />
        </>
      )}
    </>
  );
}
