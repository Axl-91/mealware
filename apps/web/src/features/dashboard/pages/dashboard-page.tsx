import { useAuth } from "@/features/auth/hooks/use-auth";
import { DashboardMetrics } from "../components/dashboard-metrics";
import { DashboardCharts } from "../components/dashboard-charts";
import { useDashboardSummary } from "../hooks/use-dashboard";

function DashboardPage() {
  const { data: authData } = useAuth();

  const {
    data,
    isPending,
    isError,
    refetch,
    isFetching,
  } = useDashboardSummary();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Bienvenido, {authData?.user.name}
      </h1>

      {isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-destructive">
            No se pudieron cargar los datos del Dashboard.
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
      ) : (
        <DashboardMetrics
          summary={data?.summary}
          isLoading={isPending}
        />
      )}

      <DashboardCharts />
    </div>
  );
}

export default DashboardPage;
