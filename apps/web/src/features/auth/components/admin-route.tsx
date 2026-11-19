import { Navigate, Outlet } from "react-router";
import { USER_ROLES } from "@mealware/shared";
import { useAuth } from "../hooks/use-auth";
import { PageLoader } from "@/components/shared/page-loader";

export function AdminRoute() {
  const { data, isPending } = useAuth();

  if (isPending) {
    return <PageLoader />;
  }

  if (data?.user.role !== USER_ROLES.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
