import {
  Archive,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/features/categories/hooks/use-categories";
import type {
  MenuItem,
} from "../api/menu-items-api";

interface MenuItemTableProps {
  menuItems: MenuItem[];
  isLoading: boolean;
  isReactivating?: boolean;
  onEdit: (menuItem: MenuItem) => void;
  onArchive: (menuItem: MenuItem) => void;
  onReactivate: (menuItem: MenuItem) => void;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatPrice(price: string) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(price));
}

export function MenuItemTable({
  menuItems,
  isLoading,
  isReactivating = false,
  onEdit,
  onArchive,
  onReactivate,
}: MenuItemTableProps) {
  const { data: activeCategoriesData } = useCategories({
    page: 1,
    limit: 100,
    status: "active",
  });

  const { data: archivedCategoriesData } = useCategories({
    page: 1,
    limit: 100,
    status: "archived",
  });

  const categoryNames = useMemo(() => {
    const categories = [
      ...(activeCategoriesData?.categories ?? []),
      ...(archivedCategoriesData?.categories ?? []),
    ];

    return new Map(
      categories.map((category) => [category.id, category.name]),
    );
  }, [activeCategoriesData, archivedCategoriesData]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Disponibilidad</TableHead>
            <TableHead>Fecha de creación</TableHead>
            <TableHead>Última actualización</TableHead>
            <TableHead className="w-[120px] text-right pr-3">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                Cargando productos...
              </TableCell>
            </TableRow>
          ) : menuItems.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                No se encontraron productos.
              </TableCell>
            </TableRow>
          ) : (
            menuItems.map((menuItem) => (
              <TableRow key={menuItem.id}>
                <TableCell className="font-medium">
                  {menuItem.name}
                </TableCell>

                <TableCell>
                  {categoryNames.get(menuItem.category_id) ??
                    "Categoría no disponible"}
                </TableCell>

                <TableCell>
                  {formatPrice(menuItem.price)}
                </TableCell>

                <TableCell>
                  {menuItem.is_available ? "Disponible" : "No disponible"}
                </TableCell>

                <TableCell>
                  {formatDate(menuItem.created_at)}
                </TableCell>

                <TableCell>
                  {formatDate(menuItem.updated_at)}
                </TableCell>

                <TableCell>
                  <div className="flex justify-end gap-1">
                    {menuItem.is_active ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${menuItem.name}`}
                          title="Editar"
                          onClick={() => onEdit(menuItem)}
                        >
                          <Pencil />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Archivar ${menuItem.name}`}
                          title="Archivar"
                          onClick={() => onArchive(menuItem)}
                        >
                          <Archive />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Reactivar ${menuItem.name}`}
                        title="Reactivar"
                        disabled={isReactivating}
                        onClick={() => onReactivate(menuItem)}
                      >
                        <RotateCcw />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
