import { useState } from "react";
import { useNavigate } from "react-router";
import { ORDER_TYPES, type CreateOrderInput } from "@mealware/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import OrderCart from "@/features/orders/components/create-order/order-cart";
import type { OrderCartItemData } from "@/features/orders/components/create-order/order-cart-item";
import OrderProductSelector from "@/features/orders/components/create-order/order-product-selector";
import type { MenuItem } from "@/features/menu-items/api/menu-items-api";
import type { OrderType } from "@/features/orders/api/orders-api";
import { useCreateOrder } from "@/features/orders/hooks/use-orders";

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const createOrder = useCreateOrder();

  const [type, setType] = useState<OrderType>(ORDER_TYPES.DINE_IN);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderCartItemData[]>([]);
  const [error, setError] = useState<string | null>(null);

  function handleAddProduct(menuItem: MenuItem) {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.menuItem.id === menuItem.id,
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentItems, { menuItem, quantity: 1 }];
    });
  }

  function handleQuantityChange(menuItemId: string, quantity: number) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item,
      ),
    );
  }

  function handleRemoveProduct(menuItemId: string) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.menuItem.id !== menuItemId),
    );
  }

  function handleCreateOrder() {
    if (items.length === 0) return;

    setError(null);

    const input: CreateOrderInput = {
      type,
      customerName: customerName.trim() || null,
      notes: notes.trim() || null,
      items: items.map(({ menuItem, quantity }) => ({
        menuItemId: menuItem.id,
        quantity,
      })),
    };

    createOrder.mutate(input, {
      onSuccess: () => {
        navigate("/orders");
      },
      onError: (mutationError) => {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "No se pudo crear la orden. Intentá nuevamente.",
        );
      },
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Nueva orden
        </h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná los productos para crear una orden.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label>Tipo de orden</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={type === ORDER_TYPES.DINE_IN ? "default" : "outline"}
              onClick={() => setType(ORDER_TYPES.DINE_IN)}
            >
              Consumo en el local
            </Button>
            <Button
              type="button"
              variant={type === ORDER_TYPES.TAKEAWAY ? "default" : "outline"}
              onClick={() => setType(ORDER_TYPES.TAKEAWAY)}
            >
              Para llevar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Nombre del cliente</Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Opcional"
              maxLength={150}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-notes">Notas de la orden</Label>
            <Textarea
              id="order-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Indicaciones adicionales..."
              rows={2}
            />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            Productos
          </h2>
          <OrderProductSelector onAdd={handleAddProduct} />
        </section>

        <aside className="lg:sticky lg:top-6">
          <OrderCart
            items={items}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveProduct}
            onSubmit={handleCreateOrder}
            isSubmitting={createOrder.isPending}
          />

          {error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
