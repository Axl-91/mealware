import { memo } from "react";
import type { Order } from "../api/orders-api";
import OrderCard from "./order-card";

interface OrdersColumnProps {
  title: string;
  orders: Order[];
  onOrderClick: (orderId: string) => void;
}

function OrdersColumn({
  title,
  orders,
  onOrderClick,
}: OrdersColumnProps) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border bg-muted/20 p-3">
      <header className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>

        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {orders.length}
        </span>
      </header>

      <div className="flex flex-col gap-3">
        {orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => onOrderClick(order.id)}
            />
          ))
        ) : (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            No hay pedidos.
          </p>
        )}
      </div>
    </section>
  );
}

export default memo(OrdersColumn);
