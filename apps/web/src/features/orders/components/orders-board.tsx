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
  const pendingOrders = orders.filter(
    (order) => order.status === ORDER_STATUSES.PENDING,
  );

  const preparingOrders = orders.filter(
    (order) => order.status === ORDER_STATUSES.PREPARING,
  );

  const readyOrders = orders.filter(
    (order) => order.status === ORDER_STATUSES.READY,
  );

  const completedOrders = orders.filter(
    (order) => order.status === ORDER_STATUSES.COMPLETED,
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
