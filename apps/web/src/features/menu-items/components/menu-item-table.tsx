import {
  Archive,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MenuItem } from "../api/menu-items-api";

interface MenuItemTableProps {
  menuItems: MenuItem[];
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
  isReactivating = false,
  onEdit,
  onArchive,
  onReactivate,
}: MenuItemTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Nombre</TableHead>
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
          {menuItems.map((menuItem) => (
            <TableRow key={menuItem.id}>
              <TableCell className="font-medium">
                {menuItem.name}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
