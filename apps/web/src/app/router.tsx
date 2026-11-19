import { createBrowserRouter } from "react-router";
import AuthLayout from "./layouts/auth-layout";
import AppLayout from "./layouts/app-layout";
import HealthPage from "@/features/health/pages/health-page";
import NotFoundPage from "@/app/pages/not-found-page";
import { LoginPage } from "@/features/auth/pages/login-page";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { PublicRoute } from "@/features/auth/components/public-route";
import { AdminRoute } from "@/features/auth/components/admin-route";
import DashboardPage from "@/features/dashboard/pages/dashboard-page";

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: "/login",
            element: <LoginPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            element: <AdminRoute />,
            children: [
              {
                path: "health",
                element: <HealthPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
