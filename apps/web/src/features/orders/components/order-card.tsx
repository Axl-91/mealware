import type { Order } from "../api/orders-api";

interface OrderCardProps {
  order: Order;
  onClick: () => void;
}

const orderTypeLabels = {
  DINE_IN: "En el local",
  TAKEAWAY: "Para llevar",
} as const;

const paymentStatusConfig = {
  UNPAID: {
    label: "Sin pagar",
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
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

const orderStatusColors = {
  PENDING: "border-t-amber-500",
  PREPARING: "border-t-blue-500",
  READY: "border-t-emerald-500",
  COMPLETED: "border-t-slate-400",
  CANCELLED: "border-t-red-500",
} as const;

function getElapsedTime(createdAt: string): string {
  const createdDate = new Date(createdAt);
  const now = new Date();

  const elapsedMilliseconds = Math.max(
    0,
    now.getTime() - createdDate.getTime(),
  );

  const elapsedMinutes = Math.floor(elapsedMilliseconds / 60_000);
  const time = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdDate);

  const isSameDay =
    createdDate.getFullYear() === now.getFullYear() &&
    createdDate.getMonth() === now.getMonth() &&
    createdDate.getDate() === now.getDate();

  if (isSameDay) {
    let elapsed: string;

    if (elapsedMinutes < 1) {
      elapsed = "Hace menos de 1 min";
    } else if (elapsedMinutes < 60) {
      elapsed = `Hace ${elapsedMinutes} min`;
    } else {
      const hours = Math.floor(elapsedMinutes / 60);
      const minutes = elapsedMinutes % 60;

      elapsed =
        minutes > 0 ? `Hace ${hours} h ${minutes} min` : `Hace ${hours} h`;
    }

    return `${elapsed} · ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const isYesterday =
    createdDate.getFullYear() === yesterday.getFullYear() &&
    createdDate.getMonth() === yesterday.getMonth() &&
    createdDate.getDate() === yesterday.getDate();

  if (isYesterday) {
    return `Ayer · ${time}`;
  }

  const date = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
  }).format(createdDate);

  return `${date} · ${time}`;
}

function formatCurrency(value: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function OrderCard({ order, onClick }: OrderCardProps) {
  const showPaymentStatus =
    order.status === "READY" || order.status === "COMPLETED";

  const paymentConfig = order.payment_status
    ? paymentStatusConfig[order.payment_status]
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-lg border border-t-4 bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${orderStatusColors[order.status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-semibold">
            Pedido #{order.order_number}
          </p>

          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {orderTypeLabels[order.type]}
          </span>
        </div>

        <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {getElapsedTime(order.created_at)}
        </span>
      </div>

      {order.customer_name && (
        <p className="mt-3 text-sm font-medium">{order.customer_name}</p>
      )}

      {showPaymentStatus && paymentConfig && (
        <div className="mt-3 flex flex-col gap-2 border-t pt-3">
          <span
            className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${paymentConfig.className}`}
          >
            {paymentConfig.label}
          </span>

          {order.payment_status === "PARTIALLY_PAID" &&
            order.outstanding_amount !== null && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Pendiente de pago
                </span>

                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(order.outstanding_amount)}
                </span>
              </div>
            )}
        </div>
      )}
    </button>
  );
}
