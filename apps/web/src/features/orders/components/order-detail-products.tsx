import type { OrderDetail } from "../api/orders-api";
import {
  formatCurrency,
  formatDateTime,
  orderStatusConfig,
  orderTypeLabels,
  paymentStatusConfig,
} from "../utils/order-detail-utils";

interface OrderDetailProductsProps {
  order: OrderDetail;
}

export default function OrderDetailProducts({
  order,
}: OrderDetailProductsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
        {order.customer_name && (
          <span className="rounded-md py-1 text-sm">
            <span className="text-muted-foreground">Cliente:</span>{" "}
            <span className="font-semibold">{order.customer_name}</span>
          </span>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {order.payment_status && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusConfig[order.payment_status].className}`}
            >
              {paymentStatusConfig[order.payment_status].label}
            </span>
          )}

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
        </div>
      </div>

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
    </>
  );
}
