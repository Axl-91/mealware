import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/use-auth";

export function ProtectedRoute() {
  const { data, isPending, isError } = useAuth();

  if (isPending) {
    return <div>Cargando...</div>;
  }

  if (isError || !data?.user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
