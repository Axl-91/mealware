import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/use-auth";

export function PublicRoute() {
  const { data, isPending, isError } = useAuth();

  if (isPending) {
    return <div>Cargando...</div>;
  }

  if (!isError && data?.user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
