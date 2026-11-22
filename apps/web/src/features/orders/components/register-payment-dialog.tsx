import { useEffect, useState } from "react";
import type { CreatePaymentInput } from "@mealware/shared";
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
import { useCreatePayment } from "../hooks/use-orders";

interface RegisterPaymentDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  paid: number;
  outstanding: number;
}

const paymentMethods: {
  value: CreatePaymentInput["method"];
  label: string;
}[] = [
    { value: "CASH", label: "Efectivo" },
    { value: "DEBIT_CARD", label: "Tarjeta de débito" },
    { value: "CREDIT_CARD", label: "Tarjeta de crédito" },
    { value: "TRANSFER", label: "Transferencia" },
  ];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function RegisterPaymentDialog({
  orderId,
  open,
  onOpenChange,
  total,
  paid,
  outstanding,
}: RegisterPaymentDialogProps) {
  const [method, setMethod] =
    useState<CreatePaymentInput["method"]>("CASH");
  const [amount, setAmount] = useState(outstanding.toFixed(2));

  const {
    mutate,
    isPending,
    isError,
    error,
    reset,
  } = useCreatePayment();

  useEffect(() => {
    if (open) {
      setMethod("CASH");
      setAmount(outstanding.toFixed(2));
      reset();
    }
  }, [open, orderId, outstanding, reset]);

  const numericAmount = Number(amount);
  const amountIsValid =
    amount.trim() !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= outstanding &&
    Math.round(numericAmount * 100) === numericAmount * 100;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!amountIsValid || isPending) return;

    mutate(
      {
        orderId,
        data: {
          method,
          amount: numericAmount,
        },
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
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Registrá un pago para esta orden. Podés abonar el saldo completo
            o realizar un pago parcial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Total de la orden
              </p>
              <p className="mt-1 text-base font-bold tabular-nums">
                {formatCurrency(total)}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Ya abonado
              </p>
              <p className="mt-1 text-base font-bold tabular-nums">
                {formatCurrency(paid)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Saldo pendiente
              </p>
              <p className="mt-1 text-base font-bold tabular-nums">
                {formatCurrency(outstanding)}
              </p>
            </div>
          </section>

          <div className="space-y-2">
            <label
              htmlFor="payment-method"
              className="text-sm font-medium"
            >
              Método de pago
            </label>

            <select
              id="payment-method"
              value={method}
              onChange={(event) =>
                setMethod(event.target.value as CreatePaymentInput["method"])
              }
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {paymentMethods.map((paymentMethod) => (
                <option
                  key={paymentMethod.value}
                  value={paymentMethod.value}
                >
                  {paymentMethod.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="payment-amount" className="text-sm font-medium">
              Importe a pagar
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                max={outstanding}
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
              El importe no puede superar el saldo pendiente de{" "}
              {formatCurrency(outstanding)}.
            </p>
          </div>

          {isError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {error instanceof Error
                ? error.message
                : "No se pudo registrar el pago. Intentá nuevamente."}
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
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isPending ? "Registrando..." : "Confirmar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
