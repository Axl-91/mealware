import { useHealth, useReadiness } from "../hooks/use-health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function HealthPage() {
  const health = useHealth();
  const readiness = useReadiness();

  const apiIsHealthy = health.data?.status === "ok";
  const databaseIsHealthy = readiness.data?.checks.database === "ok";

  const isLoading = health.isPending || readiness.isPending;

  const getStatus = (
    isPending: boolean,
    isHealthy: boolean | undefined,
    isError: boolean,
  ) => {
    if (isPending) return "Verificando...";
    if (isError) return "No disponible";
    return isHealthy ? "Operativo" : "Error";
  };

  const getStatusColor = (
    isPending: boolean,
    isHealthy: boolean | undefined,
    isError: boolean,
  ) => {
    if (isPending) return "text-muted-foreground";
    if (isError || !isHealthy) return "text-destructive";
    return "text-green-600";
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Estado del sistema
        </h1>
        <p className="text-muted-foreground">
          Monitoreo de los servicios de Mealware.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>API</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-lg font-semibold ${getStatusColor(
                health.isPending,
                apiIsHealthy,
                health.isError,
              )}`}
            >
              {getStatus(health.isPending, apiIsHealthy, health.isError)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Base de datos</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-lg font-semibold ${getStatusColor(
                readiness.isPending,
                databaseIsHealthy,
                readiness.isError,
              )}`}
            >
              {getStatus(
                readiness.isPending,
                databaseIsHealthy,
                readiness.isError,
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Actualización automática cada 30 segundos.
        </p>

        <Button
          variant="outline"
          onClick={() => {
            void health.refetch();
            void readiness.refetch();
          }}
          disabled={health.isFetching || readiness.isFetching}
        >
          Actualizar ahora
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Comprobando servicios...
        </p>
      )}
    </div>
  );
}

export default HealthPage;
