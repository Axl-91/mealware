import { useAuth } from "@/features/auth/hooks/use-auth";
import { formatDateTime } from "@/features/orders/utils/order-detail-utils";

const roleLabels = {
  ADMIN: "Administrador",
  EMPLOYEE: "Empleado",
};

function AccountPage() {
  const { data, isPending, isError, refetch, isFetching } = useAuth();

  if (isPending) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Cargando información de tu cuenta...
        </p>
      </div>
    );
  }

  if (isError || !data?.user) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>

        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-destructive">
            No se pudo cargar la información de tu cuenta.
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { user } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Información de tu cuenta y datos personales.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-lg border bg-card p-6">
          <div className="border-b pb-3">
            <h2 className="text-lg font-semibold">Información personal</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{user.name}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Correo electrónico
              </p>
              <p className="font-medium">{user.email}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Rol</p>
              <p className="font-medium">{roleLabels[user.role]}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-6">
          <div className="border-b pb-3">
            <h2 className="font-lg">Información de la cuenta</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Fecha de creación
              </p>
              <p className="font-medium">
                {formatDateTime(user.created_at)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Última actualización
              </p>
              <p className="font-medium">
                {formatDateTime(user.updated_at)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AccountPage;
