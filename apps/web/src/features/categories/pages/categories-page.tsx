import { useEffect, useState } from "react";
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
import { CategoryDialog } from "../components/category-dialog";
import { CategoryTable } from "../components/category-table";
import {
  useCategories,
  useDeactivateCategory,
  useReactivateCategory,
} from "../hooks/use-categories";
import type {
  Category,
  CategoryStatus,
} from "../api/categories-api";

const PAGE_SIZE = 10;

function CategoriesPage() {
  const [status, setStatus] = useState<CategoryStatus>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    Category | undefined
  >();

  const [categoryToArchive, setCategoryToArchive] = useState<
    Category | undefined
  >();

  const [actionError, setActionError] = useState("");

  const {
    data,
    isPending,
    isError,
    refetch,
    isFetching,
  } = useCategories({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status,
  });

  const deactivateMutation = useDeactivateCategory();
  const reactivateMutation = useReactivateCategory();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const handleStatusChange = (value: string) => {
    setStatus(value as CategoryStatus);
    setPage(1);
    setActionError("");
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCreate = () => {
    setSelectedCategory(undefined);
    setCategoryDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleArchive = async () => {
    if (!categoryToArchive) return;

    setActionError("");

    try {
      await deactivateMutation.mutateAsync(categoryToArchive.id);
      setCategoryToArchive(undefined);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo archivar la categoría.",
      );
    }
  };

  const handleReactivate = async (category: Category) => {
    setActionError("");

    try {
      await reactivateMutation.mutateAsync(category.id);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo reactivar la categoría.",
      );
    }
  };

  const categories = data?.categories ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Categorías
          </h1>
          <p className="text-sm text-muted-foreground">
            Administrá las categorías de tus productos.
          </p>
        </div>

        <Button onClick={handleCreate}>
          <Plus />
          Nueva categoría
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Buscar categorías..."
            className="pl-9"
          />
        </div>

        <Tabs value={status} onValueChange={handleStatusChange}>
          <TabsList>
            <TabsTrigger value="active">Activas</TabsTrigger>
            <TabsTrigger value="archived">Archivadas</TabsTrigger>
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
            No se pudieron cargar las categorías.
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
        <CategoryTable
          categories={categories}
          status={status}
          isLoading={isPending}
          isReactivating={reactivateMutation.isPending}
          onEdit={handleEdit}
          onArchive={(category) => {
            setActionError("");
            setCategoryToArchive(category);
          }}
          onReactivate={handleReactivate}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages} ·{" "}
            {pagination.total} categorías
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={
                page >= pagination.totalPages || isFetching
              }
              onClick={() => setPage((current) => current + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={selectedCategory}
      />

      <AlertDialog
        open={Boolean(categoryToArchive)}
        onOpenChange={(open) => {
          if (!open) setCategoryToArchive(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Archivar categoría?
            </AlertDialogTitle>

            <AlertDialogDescription>
              ¿Estás seguro de que querés archivar{" "}
              <span className="font-medium">
                {categoryToArchive?.name}
              </span>
              ? Podrás reactivarla más adelante.
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

export default CategoriesPage;
