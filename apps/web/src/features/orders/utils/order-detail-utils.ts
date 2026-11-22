import type { OrderDetail, OrderStatus } from "../api/orders-api";

export const orderTypeLabels = {
  DINE_IN: "En el local",
  TAKEAWAY: "Para llevar",
} as const;

export const orderStatusConfig = {
  PENDING: {
    label: "Pendiente",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  PREPARING: {
    label: "Preparando",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
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
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
} as const;

export const paymentMethodLabels = {
  CASH: "Efectivo",
  DEBIT_CARD: "Tarjeta de débito",
  CREDIT_CARD: "Tarjeta de crédito",
  TRANSFER: "Transferencia",
} as const;

export const paymentStatusConfig = {
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

export const nextOrderStatus: Partial<
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

export const cancellableStatuses: OrderStatus[] = [
  "PENDING",
  "PREPARING",
  "READY",
];

export interface OrderPaymentTotals {
  paid: number;
  refunded: number;
  outstanding: number;
}

export function calculateOrderPaymentTotals(
  order: Pick<OrderDetail, "total" | "payments">,
): OrderPaymentTotals {
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

  const outstanding = Math.max(Number(order.total) - (paid - refunded), 0);

  return { paid, refunded, outstanding };
}

export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function hasRefundablePayments(
  payments: OrderDetail["payments"],
): boolean {
  return payments.some((payment) => {
    const refunded = payment.refunds.reduce(
      (sum, refund) => sum + Number(refund.amount),
      0,
    );

    return Number(payment.amount) - refunded > 0;
  });
}
