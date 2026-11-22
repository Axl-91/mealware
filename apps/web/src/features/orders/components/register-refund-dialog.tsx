import { useEffect, useState } from "react";
import type { CreateRefundInput } from "@mealware/shared";
import type { OrderPayment } from "../api/orders-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateRefund } from "../hooks/use-orders";

interface RegisterRefundDialogProps {
  orderId: string;
  payments: OrderPayment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RefundablePayment extends OrderPayment {
  refunded: number;
  refundable: number;
}

const paymentMethodLabels: Record<OrderPayment["method"], string> = {
  CASH: "Efectivo",
  DEBIT_CARD: "Tarjeta de débito",
  CREDIT_CARD: "Tarjeta de crédito",
  TRANSFER: "Transferencia",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(value);
}

function getRefundablePayments(
  payments: OrderPayment[],
): RefundablePayment[] {
  return payments
    .map((payment) => {
      const refunded = payment.refunds.reduce(
        (total, refund) => total + Number(refund.amount),
        0,
      );

      const refundable = Math.max(Number(payment.amount) - refunded, 0);

      return {
        ...payment,
        refunded,
        refundable,
      };
    })
    .filter((payment) => payment.refundable > 0);
}

export default function RegisterRefundDialog({
  orderId,
  payments,
  open,
  onOpenChange,
}: RegisterRefundDialogProps) {
  const refundablePayments = getRefundablePayments(payments);

  const [paymentId, setPaymentId] = useState("");
  const [amount, setAmount] = useState("");

  const {
    mutate,
    isPending,
    isError,
    error,
    reset,
  } = useCreateRefund();

  const selectedPayment = refundablePayments.find(
    (payment) => payment.id === paymentId,
  );

  useEffect(() => {
    if (open) {
      const firstPayment = getRefundablePayments(payments)[0];

      setPaymentId(firstPayment?.id ?? "");
      setAmount(firstPayment?.refundable.toFixed(2) ?? "");
      reset();
    }
  }, [open, orderId, payments, reset]);

  const numericAmount = Number(amount);

  const amountIsValid =
    selectedPayment !== undefined &&
    amount.trim() !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= selectedPayment.refundable &&
    Math.round(numericAmount * 100) === numericAmount * 100;

  function handlePaymentChange(nextPaymentId: string) {
    const nextPayment = refundablePayments.find(
      (payment) => payment.id === nextPaymentId,
    );

    setPaymentId(nextPaymentId);
    setAmount(nextPayment?.refundable.toFixed(2) ?? "");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPayment || !amountIsValid || isPending) return;

    const data: CreateRefundInput = {
      amount: numericAmount,
    };

    mutate(
      {
        paymentId: selectedPayment.id,
        data,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar devolución</DialogTitle>
          <DialogDescription>
            Seleccioná el pago sobre el que querés realizar la devolución.
            Podés devolver el importe completo o una parte.
          </DialogDescription>
        </DialogHeader>

        {refundablePayments.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            No hay pagos con saldo disponible para devolver.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="refund-payment"
                className="text-sm font-medium"
              >
                Pago a devolver
              </label>

              <select
                id="refund-payment"
                value={paymentId}
                onChange={(event) =>
                  handlePaymentChange(event.target.value)
                }
                disabled={isPending}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refundablePayments.map((payment) => (
                  <option key={payment.id} value={payment.id}>
                    {paymentMethodLabels[payment.method]} —{" "}
                    {formatCurrency(Number(payment.amount))}
                  </option>
                ))}
              </select>
            </div>

            {selectedPayment && (
              <>
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Importe original
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums">
                      {formatCurrency(Number(selectedPayment.amount))}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
                    <p className="text-xs font-medium text-red-700 dark:text-red-300">
                      Ya devuelto
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums">
                      {formatCurrency(selectedPayment.refunded)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Disponible
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums">
                      {formatCurrency(selectedPayment.refundable)}
                    </p>
                  </div>
                </section>

                <div className="space-y-2">
                  <label
                    htmlFor="refund-amount"
                    className="text-sm font-medium"
                  >
                    Importe a devolver
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>

                    <Input
                      id="refund-amount"
                      type="number"
                      min="0.01"
                      max={selectedPayment.refundable}
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      disabled={isPending}
                      className="pl-7 text-base font-semibold tabular-nums"
                      placeholder="0,00"
                      required
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    El importe no puede superar los{" "}
                    {formatCurrency(selectedPayment.refundable)} disponibles
                    para este pago.
                  </p>
                </div>
              </>
            )}

            {isError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              >
                {error instanceof Error
                  ? error.message
                  : "No se pudo registrar la devolución. Intentá nuevamente."}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Volver
              </Button>

              <Button
                type="submit"
                disabled={!amountIsValid || isPending}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isPending ? "Registrando..." : "Confirmar devolución"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
