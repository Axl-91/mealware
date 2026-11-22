import type { OrderDetail } from "../api/orders-api";
import {
  formatCurrency,
  formatDateTime,
  paymentMethodLabels,
} from "../utils/order-detail-utils";

interface OrderMovementsProps {
  payments: OrderDetail["payments"];
}

export default function OrderMovements({
  payments,
}: OrderMovementsProps) {
  const movements = payments
    .flatMap((payment) => [
      {
        id: payment.id,
        type: "PAYMENT" as const,
        amount: Number(payment.amount),
        method: payment.method,
        createdAt: payment.created_at,
      },
      ...payment.refunds.map((refund) => ({
        id: refund.id,
        type: "REFUND" as const,
        amount: Number(refund.amount),
        method: payment.method,
        createdAt: refund.created_at,
      })),
    ])
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime(),
    );

  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="border-l-4 border-violet-500 pl-3 font-semibold">
          Movimientos
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({movements.length})
          </span>
        </span>

        <span className="text-sm text-muted-foreground transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>

      <div className="border-t">
        {movements.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Todavía no hay movimientos registrados.
          </p>
        ) : (
          <div className="divide-y">
            {movements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {movement.type === "PAYMENT"
                      ? "Pago registrado"
                      : "Devolución registrada"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {paymentMethodLabels[movement.method]} ·{" "}
                    {formatDateTime(movement.createdAt)}
                  </p>
                </div>

                <span
                  className={`shrink-0 text-sm font-bold tabular-nums ${movement.type === "REFUND"
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                    }`}
                >
                  {movement.type === "REFUND" ? "−" : "+"}
                  {formatCurrency(movement.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
