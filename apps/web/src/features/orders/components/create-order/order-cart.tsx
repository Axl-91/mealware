import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OrderCartItem, {
  type OrderCartItemData,
} from "./order-cart-item";

interface OrderCartProps {
  items: OrderCartItemData[];
  onQuantityChange: (menuItemId: string, quantity: number) => void;
  onRemove: (menuItemId: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

export default function OrderCart({
  items,
  onQuantityChange,
  onRemove,
  onSubmit,
  isSubmitting = false,
}: OrderCartProps) {
  const totalInCents = items.reduce(
    (total, item) =>
      total + Math.round(Number(item.menuItem.price) * 100) * item.quantity,
    0,
  );

  const total = totalInCents / 100;

  const totalQuantity = items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="size-5" />
          Tu orden
          <span className="text-sm font-normal text-muted-foreground">
            ({totalQuantity} {totalQuantity === 1 ? "producto" : "productos"})
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no agregaste productos.
          </p>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <OrderCartItem
                key={item.menuItem.id}
                item={item}
                onQuantityChange={onQuantityChange}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold tabular-nums">
            {currencyFormatter.format(total)}
          </span>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={items.length === 0 || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "Creando orden..." : "Crear orden"}
        </Button>
      </CardContent>
    </Card>
  );
}
