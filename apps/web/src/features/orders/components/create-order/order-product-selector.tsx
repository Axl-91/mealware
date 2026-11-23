import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/features/categories/hooks/use-categories";
import {
  useMenuItems,
} from "@/features/menu-items/hooks/use-menu-items";
import type { MenuItem } from "@/features/menu-items/api/menu-items-api";

interface OrderProductSelectorProps {
  onAdd: (menuItem: MenuItem) => void;
}

function formatPrice(price: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(price));
}

export default function OrderProductSelector({
  onAdd,
}: OrderProductSelectorProps) {
  const [search, setSearch] = useState("");

  const {
    data: menuItemsData,
    isPending: isMenuItemsPending,
    isError: isMenuItemsError,
    refetch: refetchMenuItems,
    isFetching: isMenuItemsFetching,
  } = useMenuItems("active");

  const {
    data: categoriesData,
    isPending: isCategoriesPending,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useCategories({
    page: 1,
    limit: 100,
    status: "active",
  });

  const availableMenuItems = useMemo(
    () =>
      (menuItemsData?.menuItems ?? []).filter(
        (menuItem) => menuItem.is_available,
      ),
    [menuItemsData],
  );

  const filteredMenuItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    if (!normalizedSearch) return availableMenuItems;

    return availableMenuItems.filter((menuItem) => {
      const name = menuItem.name.toLocaleLowerCase();
      const description =
        menuItem.description?.toLocaleLowerCase() ?? "";

      return (
        name.includes(normalizedSearch) ||
        description.includes(normalizedSearch)
      );
    });
  }, [availableMenuItems, search]);

  const groupedMenuItems = useMemo(() => {
    const categories = categoriesData?.categories ?? [];

    const categoryNames = new Map(
      categories.map((category) => [category.id, category.name]),
    );

    const groups = new Map<
      string,
      { categoryName: string; menuItems: MenuItem[] }
    >();

    for (const menuItem of filteredMenuItems) {
      const categoryName =
        categoryNames.get(menuItem.category_id) ??
        "Categoría no disponible";

      const group = groups.get(menuItem.category_id);

      if (group) {
        group.menuItems.push(menuItem);
      } else {
        groups.set(menuItem.category_id, {
          categoryName,
          menuItems: [menuItem],
        });
      }
    }

    return [...groups.entries()]
      .map(([categoryId, group]) => ({
        categoryId,
        ...group,
      }))
      .sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName, "es"),
      );
  }, [categoriesData, filteredMenuItems]);

  const handleRetry = () => {
    void refetchMenuItems();
    void refetchCategories();
  };

  if (isMenuItemsPending || isCategoriesPending) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Cargando productos...
      </p>
    );
  }

  if (isMenuItemsError || isCategoriesError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-destructive">
          No se pudieron cargar los productos.
        </p>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={isMenuItemsFetching}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar productos..."
          className="pl-9"
        />
      </div>

      {groupedMenuItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {availableMenuItems.length === 0
            ? "No hay productos disponibles para agregar."
            : "No se encontraron productos."}
        </p>
      ) : (
        <div className="space-y-8">
          {groupedMenuItems.map((group) => (
            <section key={group.categoryId} className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                {group.categoryName}
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.menuItems.map((menuItem) => (
                  <article
                    key={menuItem.id}
                    className="flex flex-col justify-between gap-4 rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <h3 className="font-medium">
                        {menuItem.name}
                      </h3>

                      {menuItem.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {menuItem.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold tabular-nums">
                        {formatPrice(menuItem.price)}
                      </span>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onAdd(menuItem)}
                      >
                        <Plus />
                        Agregar
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
