import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  type CreateMenuItemInput,
  type UpdateMenuItemInput,
} from "@mealware/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MenuItem } from "../api/menu-items-api";
import { useCategories } from "@/features/categories/hooks/use-categories";
import {
  useCreateMenuItem,
  useUpdateMenuItem,
} from "../hooks/use-menu-items";

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem?: MenuItem;
}

type MenuItemFormValues = CreateMenuItemInput | UpdateMenuItemInput;

export function MenuItemDialog({
  open,
  onOpenChange,
  menuItem,
}: MenuItemDialogProps) {
  const isEditing = Boolean(menuItem);

  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();

  const {
    data: categoriesData,
    isPending: isCategoriesPending,
    isError: isCategoriesError,
  } = useCategories({
    page: 1,
    limit: 100,
    status: "active",
  });

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(
      isEditing ? updateMenuItemSchema : createMenuItemSchema,
    ),
    defaultValues: {
      categoryId: menuItem?.category_id ?? "",
      name: menuItem?.name ?? "",
      description: menuItem?.description ?? "",
      price: menuItem ? Number(menuItem.price) : 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        categoryId: menuItem?.category_id ?? "",
        name: menuItem?.name ?? "",
        description: menuItem?.description ?? "",
        price: menuItem ? Number(menuItem.price) : 0,
      });
    }
  }, [open, menuItem, form]);

  const onSubmit = async (values: MenuItemFormValues) => {
    const input = {
      ...values,
      description: values.description?.trim() || null,
    };

    try {
      if (menuItem) {
        await updateMutation.mutateAsync({
          menuItemId: menuItem.id,
          input,
        });
      } else {
        await createMutation.mutateAsync(input);
      }

      onOpenChange(false);
      form.reset();
    } catch {
      // The mutation error is handled by the UI below.
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;
  const categories = categoriesData?.categories ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>

          <DialogDescription>
            {isEditing
              ? "Modificá los datos del producto."
              : "Ingresá los datos del nuevo producto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="menu-item-category">Categoría</Label>

            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={
                    isPending ||
                    isCategoriesPending ||
                    categories.length === 0
                  }
                >
                  <SelectTrigger id="menu-item-category" className="w-full">
                    <SelectValue
                      placeholder={
                        isCategoriesPending
                          ? "Cargando categorías..."
                          : "Seleccioná una categoría"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            {form.formState.errors.categoryId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.categoryId.message}
              </p>
            )}

            {isCategoriesError && (
              <p className="text-sm text-destructive">
                No se pudieron cargar las categorías.
              </p>
            )}

            {!isCategoriesPending &&
              !isCategoriesError &&
              categories.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay categorías activas disponibles.
                </p>
              )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-item-name">Nombre</Label>

            <Input
              id="menu-item-name"
              placeholder="Ej. Hamburguesa clásica"
              maxLength={150}
              {...form.register("name")}
              disabled={isPending}
            />

            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-item-description">Descripción</Label>

            <Textarea
              id="menu-item-description"
              placeholder="Descripción del producto..."
              {...form.register("description")}
              disabled={isPending}
            />

            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-item-price">Precio</Label>

            <Input
              id="menu-item-price"
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              {...form.register("price", {
                valueAsNumber: true,
              })}
              disabled={isPending}
            />

            {form.formState.errors.price && (
              <p className="text-sm text-destructive">
                {form.formState.errors.price.message}
              </p>
            )}
          </div>

          {mutationError && (
            <p className="text-sm text-destructive">
              {mutationError.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isPending || isCategoriesPending || categories.length === 0}
            >
              {isPending
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
