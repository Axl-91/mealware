import { useMemo, useState } from "react";
import { ORDER_STATUSES } from "@mealware/shared";
import { useOrders } from "../hooks/use-orders";
import OrdersBoard from "../components/orders-board";
import CancelledOrders from "../components/cancelled-orders";
import OrderDetailDialog from "../components/order-detail-dialog";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export default function OrdersPage() {
  const { data, isPending, isError, refetch } = useOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const navigate = useNavigate();

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

        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pedidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestioná los pedidos del restaurante.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button onClick={() => navigate("/orders/new")}>
            <Plus />
            Nueva orden
          </Button>
        </div>
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
