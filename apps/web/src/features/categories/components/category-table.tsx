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
import type {
  Category,
  CategoryStatus,
} from "../api/categories-api";

interface CategoryTableProps {
  categories: Category[];
  status: CategoryStatus;
  isLoading: boolean;
  isReactivating?: boolean;
  onEdit: (category: Category) => void;
  onArchive: (category: Category) => void;
  onReactivate: (category: Category) => void;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function CategoryTable({
  categories,
  status,
  isLoading,
  isReactivating = false,
  onEdit,
  onArchive,
  onReactivate,
}: CategoryTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Fecha de creación</TableHead>
            <TableHead>Última actualización</TableHead>
            <TableHead className="w-[120px] text-right">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                Cargando categorías...
              </TableCell>
            </TableRow>
          ) : categories.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                No se encontraron categorías.
              </TableCell>
            </TableRow>
          ) : (
            categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">
                  {category.name}
                </TableCell>

                <TableCell>
                  {formatDate(category.created_at)}
                </TableCell>

                <TableCell>
                  {formatDate(category.updated_at)}
                </TableCell>

                <TableCell>
                  <div className="flex justify-end gap-1">
                    {status === "active" ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${category.name}`}
                          title="Editar"
                          onClick={() => onEdit(category)}
                        >
                          <Pencil />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Archivar ${category.name}`}
                          title="Archivar"
                          onClick={() => onArchive(category)}
                        >
                          <Archive />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Reactivar ${category.name}`}
                        title="Reactivar"
                        disabled={isReactivating}
                        onClick={() => onReactivate(category)}
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
