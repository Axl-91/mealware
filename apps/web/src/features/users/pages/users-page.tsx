import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { UserDialog } from "../components/user-dialog";
import { UsersTable } from "../components/users-table";
import {
  useDeactivateUser,
  useUsers,
} from "../hooks/use-users";
import type { User } from "../api/users-api";

function UsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();

  const [userToDeactivate, setUserToDeactivate] = useState<
    User | undefined
  >();

  const [actionError, setActionError] = useState("");

  const { data, isPending, isError, refetch, isFetching } = useUsers();

  const deactivateMutation = useDeactivateUser();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const handleCreate = () => {
    setSelectedUser(undefined);
    setUserDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleDeactivate = async () => {
    if (!userToDeactivate) return;

    setActionError("");

    try {
      await deactivateMutation.mutateAsync(userToDeactivate.id);
      setUserToDeactivate(undefined);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo desactivar el usuario.",
      );
    }
  };

  const users = (data?.users ?? []).filter((user) => {
    const normalizedSearch = debouncedSearch.toLowerCase();

    return (
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Usuarios
          </h1>
          <p className="text-sm text-muted-foreground">
            Administrá los usuarios de tu restaurante.
          </p>
        </div>

        <Button onClick={handleCreate}>
          <Plus />
          Nuevo usuario
        </Button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar usuarios..."
          className="pl-9"
        />
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-destructive">
            No se pudieron cargar los usuarios.
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
      ) : (
        <UsersTable
          users={users}
          isLoading={isPending}
          onEdit={handleEdit}
          onDeactivate={(user) => {
            setActionError("");
            setUserToDeactivate(user);
          }}
        />
      )}

      <UserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        user={selectedUser}
      />

      <AlertDialog
        open={Boolean(userToDeactivate)}
        onOpenChange={(open) => {
          if (!open) setUserToDeactivate(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Desactivar usuario?
            </AlertDialogTitle>

            <AlertDialogDescription>
              ¿Estás seguro de que querés desactivar a{" "}
              <span className="font-medium">
                {userToDeactivate?.name}
              </span>
              ? El usuario dejará de tener acceso al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending
                ? "Desactivando..."
                : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default UsersPage;
