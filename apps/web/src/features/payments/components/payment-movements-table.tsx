import type { PaymentMovement } from "../api/payments-api";
import {
  formatCurrency,
  formatDateTime,
  paymentMethodLabels,
} from "@/features/orders/utils/order-detail-utils";
import { Button } from "@/components/ui/button";

interface PaymentMovementsTableProps {
  movements: PaymentMovement[];
  isLoading: boolean;
  onOrderClick: (orderId: string) => void;
}

export function PaymentMovementsTable({
  movements,
  isLoading,
  onOrderClick,
}: PaymentMovementsTableProps) {
  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-[1fr_auto] gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium md:grid-cols-[1fr_140px_160px_140px]">
        <span>Movimiento</span>
        <span className="hidden md:block">Orden</span>
        <span className="hidden md:block">Fecha</span>
        <span className="text-right">Importe</span>
      </div>

      {isLoading ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Cargando movimientos...
        </p>
      ) : movements.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          No se encontraron movimientos.
        </p>
      ) : (
        <div className="divide-y">
          {movements.map((movement) => (
            <div
              key={`${movement.type}-${movement.id}`}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 md:grid-cols-[1fr_140px_160px_140px]"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {movement.type === "PAYMENT"
                    ? "Pago registrado"
                    : "Devolución registrada"}
                </p>

                <p className="text-xs text-muted-foreground">
                  {paymentMethodLabels[movement.method]}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2 md:hidden">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => onOrderClick(movement.order_id)}
                  >
                    Orden #{movement.order_number}
                  </Button>

                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(movement.created_at)}
                  </span>
                </div>
              </div>

              <div className="hidden md:block">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => onOrderClick(movement.order_id)}
                >
                  #{movement.order_number}
                </Button>
              </div>

              <span className="hidden text-sm text-muted-foreground md:block">
                {formatDateTime(movement.created_at)}
              </span>

              <span
                className={`text-right text-sm font-bold tabular-nums ${movement.type === "REFUND"
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
                  }`}
              >
                {movement.type === "REFUND" ? "" : "+"}
                {formatCurrency(movement.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
