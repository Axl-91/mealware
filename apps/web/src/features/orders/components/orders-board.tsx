import { useMemo } from "react";
import { ORDER_STATUSES } from "@mealware/shared";
import type { Order } from "../api/orders-api";
import OrdersColumn from "./orders-column";

interface OrdersBoardProps {
  orders: Order[];
  onOrderClick: (orderId: string) => void;
}

export default function OrdersBoard({
  orders,
  onOrderClick,
}: OrdersBoardProps) {
  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === ORDER_STATUSES.PENDING),
    [orders],
  );

  const preparingOrders = useMemo(
    () => orders.filter((order) => order.status === ORDER_STATUSES.PREPARING),
    [orders],
  );

  const readyOrders = useMemo(
    () => orders.filter((order) => order.status === ORDER_STATUSES.READY),
    [orders],
  );

  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === ORDER_STATUSES.COMPLETED),
    [orders],
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <OrdersColumn
        title="Pendientes"
        orders={pendingOrders}
        onOrderClick={onOrderClick}
      />

      <OrdersColumn
        title="Preparando"
        orders={preparingOrders}
        onOrderClick={onOrderClick}
      />

      <OrdersColumn
        title="Listas"
        orders={readyOrders}
        onOrderClick={onOrderClick}
      />

      <OrdersColumn
        title="Completadas"
        orders={completedOrders}
        onOrderClick={onOrderClick}
      />
    </div>
  );
}
