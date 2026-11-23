import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/features/menu-items/api/menu-items-api";

export interface OrderCartItemData {
  menuItem: MenuItem;
  quantity: number;
}

interface OrderCartItemProps {
  item: OrderCartItemData;
  onQuantityChange: (menuItemId: string, quantity: number) => void;
  onRemove: (menuItemId: string) => void;
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

export default function OrderCartItem({
  item,
  onQuantityChange,
  onRemove,
}: OrderCartItemProps) {
  const { menuItem, quantity } = item;
  const unitPrice = Number(menuItem.price);
  const subtotal = (Math.round(unitPrice * 100) * quantity) / 100;

  return (
    <article className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium">{menuItem.name}</p>

        <p className="text-sm text-muted-foreground">
          {currencyFormatter.format(unitPrice)} c/u
        </p>

        <p className="text-sm font-semibold tabular-nums">
          {currencyFormatter.format(subtotal)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          disabled={quantity <= 1}
          onClick={() => onQuantityChange(menuItem.id, quantity - 1)}
          aria-label={`Disminuir cantidad de ${menuItem.name}`}
        >
          <Minus className="size-3.5" />
        </Button>

        <span className="w-7 text-center text-sm font-medium tabular-nums">
          {quantity}
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onQuantityChange(menuItem.id, quantity + 1)}
          aria-label={`Aumentar cantidad de ${menuItem.name}`}
        >
          <Plus className="size-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(menuItem.id)}
          aria-label={`Eliminar ${menuItem.name} del carrito`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </article>
  );
}
