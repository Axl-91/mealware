
import { useAuth } from "@/features/auth/hooks/use-auth";

function DashboardPage() {
  const { data } = useAuth();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Bienvenido, {data?.user.name}
      </h1>
    </div>
  );
}

export default DashboardPage;
