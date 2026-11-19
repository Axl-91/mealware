import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/use-auth";
import { PageLoader } from "@/components/shared/page-loader";

export function PublicRoute() {
  const { data, isPending, isError } = useAuth();

  if (isPending) {
    return <PageLoader />;
  }

  if (!isError && data?.user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
