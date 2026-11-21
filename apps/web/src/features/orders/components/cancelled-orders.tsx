import type { Order } from "../api/orders-api";
import OrderCard from "./order-card";

interface CancelledOrdersProps {
  orders: Order[];
  onOrderClick: (orderId: string) => void;
}

export default function CancelledOrders({
  orders,
  onOrderClick,
}: CancelledOrdersProps) {
  if (orders.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pedidos cancelados</h2>

        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {orders.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onClick={() => onOrderClick(order.id)}
          />
        ))}
      </div>
    </section>
  );
}
