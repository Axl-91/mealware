import { Pencil, UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { User } from "../api/users-api";

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

const roleLabels = {
  ADMIN: "Administrador",
  EMPLOYEE: "Empleado",
} as const;

export function UsersTable({
  users,
  isLoading,
  onEdit,
  onDeactivate,
}: UsersTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
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
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                Cargando usuarios...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No se encontraron usuarios.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name}
                </TableCell>

                <TableCell>{user.email}</TableCell>

                <TableCell>{roleLabels[user.role]}</TableCell>

                <TableCell>{formatDate(user.created_at)}</TableCell>

                <TableCell>{formatDate(user.updated_at)}</TableCell>

                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${user.name}`}
                      title="Editar"
                      onClick={() => onEdit(user)}
                    >
                      <Pencil />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Desactivar ${user.name}`}
                      title="Desactivar"
                      onClick={() => onDeactivate(user)}
                    >
                      <UserRoundX />
                    </Button>
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
