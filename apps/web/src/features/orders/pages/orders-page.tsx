
import { useMemo, useState } from "react";
import { ORDER_STATUSES } from "@mealware/shared";
import { useOrders } from "../hooks/use-orders";
import OrdersBoard from "../components/orders-board";
import CancelledOrders from "../components/cancelled-orders";
import OrderDetailDialog from "../components/order-detail-dialog";

export default function OrdersPage() {
  const { data, isPending, isError, refetch, isFetching } = useOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const orders = data?.orders ?? [];

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== ORDER_STATUSES.CANCELLED,
      ),
    [orders],
  );

  const cancelledOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status === ORDER_STATUSES.CANCELLED,
      ),
    [orders],
  );

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando pedidos...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive">
          No se pudieron cargar los pedidos.
        </p>

        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm font-medium underline underline-offset-4"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pedidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestioná los pedidos del restaurante.
          </p>
        </div>

        {isFetching && (
          <span className="text-xs text-muted-foreground">
            Actualizando...
          </span>
        )}
      </header>

      <OrdersBoard
        orders={activeOrders}
        onOrderClick={setSelectedOrderId}
      />

      <CancelledOrders
        orders={cancelledOrders}
        onOrderClick={setSelectedOrderId}
      />

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
