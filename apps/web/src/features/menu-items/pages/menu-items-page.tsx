import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { MenuItemDialog } from "../components/menu-item-dialog";
import { MenuItemTable } from "../components/menu-item-table";
import {
  useDeactivateMenuItem,
  useMenuItems,
  useReactivateMenuItem,
} from "../hooks/use-menu-items";
import type {
  MenuItem,
  MenuItemStatus,
} from "../api/menu-items-api";

type MenuItemListStatus = Exclude<MenuItemStatus, "all">;

function MenuItemsPage() {
  const [status, setStatus] = useState<MenuItemListStatus>("active");
  const [search, setSearch] = useState("");

  const [menuItemDialogOpen, setMenuItemDialogOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<
    MenuItem | undefined
  >();

  const [menuItemToArchive, setMenuItemToArchive] = useState<
    MenuItem | undefined
  >();

  const [actionError, setActionError] = useState("");

  const {
    data,
    isPending,
    isError,
    refetch,
    isFetching,
  } = useMenuItems(status);

  const {
    data: activeCategoriesData,
    isPending: isActiveCategoriesPending,
    isError: isActiveCategoriesError,
  } = useCategories({
    page: 1,
    limit: 100,
    status: "active",
  });

  const {
    data: archivedCategoriesData,
    isPending: isArchivedCategoriesPending,
    isError: isArchivedCategoriesError,
  } = useCategories({
    page: 1,
    limit: 100,
    status: "archived",
  });

  const deactivateMutation = useDeactivateMenuItem();
  const reactivateMutation = useReactivateMenuItem();

  const menuItems = data?.menuItems ?? [];

  const categories = useMemo(
    () => [
      ...(activeCategoriesData?.categories ?? []),
      ...(archivedCategoriesData?.categories ?? []),
    ],
    [activeCategoriesData, archivedCategoriesData],
  );

  const filteredMenuItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    if (!normalizedSearch) return menuItems;

    return menuItems.filter((menuItem) => {
      const name = menuItem.name.toLocaleLowerCase();
      const description = menuItem.description?.toLocaleLowerCase() ?? "";

      return (
        name.includes(normalizedSearch) ||
        description.includes(normalizedSearch)
      );
    });
  }, [menuItems, search]);

  const groupedMenuItems = useMemo(() => {
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
  }, [categories, filteredMenuItems]);

  const handleStatusChange = (value: string) => {
    setStatus(value as MenuItemListStatus);
    setActionError("");
  };

  const handleCreate = () => {
    setSelectedMenuItem(undefined);
    setMenuItemDialogOpen(true);
  };

  const handleEdit = (menuItem: MenuItem) => {
    setSelectedMenuItem(menuItem);
    setMenuItemDialogOpen(true);
  };

  const handleArchive = async () => {
    if (!menuItemToArchive) return;

    setActionError("");

    try {
      await deactivateMutation.mutateAsync(menuItemToArchive.id);
      setMenuItemToArchive(undefined);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo archivar el producto.",
      );
    }
  };

  const handleReactivate = async (menuItem: MenuItem) => {
    setActionError("");

    try {
      await reactivateMutation.mutateAsync(menuItem.id);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo reactivar el producto.",
      );
    }
  };

  const isCategoriesLoading =
    isActiveCategoriesPending || isArchivedCategoriesPending;

  const hasCategoriesError =
    isActiveCategoriesError || isArchivedCategoriesError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Productos
          </h1>
          <p className="text-sm text-muted-foreground">
            Administrá los productos de tu menú.
          </p>
        </div>

        <Button onClick={handleCreate}>
          <Plus />
          Nuevo producto
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar productos..."
            className="pl-9"
          />
        </div>

        <Tabs value={status} onValueChange={handleStatusChange}>
          <TabsList>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="archived">Archivados</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-destructive">
            No se pudieron cargar los productos.
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Reintentar
          </Button>
        </div>
      ) : hasCategoriesError ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar las categorías.
        </p>
      ) : isPending || isCategoriesLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Cargando productos...
        </p>
      ) : groupedMenuItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No se encontraron productos.
        </p>
      ) : (
        <div className="space-y-8">
          {groupedMenuItems.map((group) => (
            <section key={group.categoryId} className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                {group.categoryName}
              </h2>

              <MenuItemTable
                menuItems={group.menuItems}
                isReactivating={reactivateMutation.isPending}
                onEdit={handleEdit}
                onArchive={(menuItem) => {
                  setActionError("");
                  setMenuItemToArchive(menuItem);
                }}
                onReactivate={handleReactivate}
              />
            </section>
          ))}
        </div>
      )}

      <MenuItemDialog
        open={menuItemDialogOpen}
        onOpenChange={setMenuItemDialogOpen}
        menuItem={selectedMenuItem}
      />

      <AlertDialog
        open={Boolean(menuItemToArchive)}
        onOpenChange={(open) => {
          if (!open) setMenuItemToArchive(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Archivar producto?
            </AlertDialogTitle>

            <AlertDialogDescription>
              ¿Estás seguro de que querés archivar{" "}
              <span className="font-medium">
                {menuItemToArchive?.name}
              </span>
              ? Podrás reactivarlo más adelante.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleArchive}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending
                ? "Archivando..."
                : "Archivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MenuItemsPage;
