import type { OrderDetail } from "../api/orders-api";
import type { OrderPaymentTotals } from "../utils/order-detail-utils";
import {
  formatCurrency,
} from "../utils/order-detail-utils";

interface OrderPaymentSummaryProps {
  order: OrderDetail;
  totals: OrderPaymentTotals;
}

export default function OrderPaymentSummary({
  order,
  totals,
}: OrderPaymentSummaryProps) {
  return (
    <section className="space-y-3">
      <h3 className="border-l-4 border-emerald-500 pl-3 font-semibold">
        Resumen de pago
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Total
          </p>
          <p className="mt-1 font-bold tabular-nums">
            {formatCurrency(order.total)}
          </p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Pagado
          </p>
          <p className="mt-1 font-bold tabular-nums">
            {formatCurrency(totals.paid)}
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-xs font-medium text-red-700 dark:text-red-300">
            Devuelto
          </p>
          <p className="mt-1 font-bold tabular-nums">
            {formatCurrency(totals.refunded)}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Pendiente
          </p>
          <p className="mt-1 font-bold tabular-nums">
            {formatCurrency(totals.outstanding)}
          </p>
        </div>
      </div>
    </section>
  );
}
