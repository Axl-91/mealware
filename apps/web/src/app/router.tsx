import { createBrowserRouter } from "react-router";
import AuthLayout from "./layouts/auth-layout";
import AppLayout from "./layouts/app-layout";

import { LoginPage } from "@/features/auth/pages/login-page";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { PublicRoute } from "@/features/auth/components/public-route";
import { AdminRoute } from "@/features/auth/components/admin-route";

import NotFoundPage from "@/app/pages/not-found-page";
import HealthPage from "@/features/health/pages/health-page";
import DashboardPage from "@/features/dashboard/pages/dashboard-page";
import CategoriesPage from "@/features/categories/pages/categories-page";
import MenuItemsPage from "@/features/menu-items/pages/menu-items-page";
import OrdersPage from "@/features/orders/pages/orders-page";
import CreateOrderPage from "@/features/orders/pages/create-order-page";
import PaymentsPage from "@/features/payments/pages/payments-page";
import UsersPage from "@/features/users/pages/users-page";

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
            path: "orders",
            children: [
              {
                index: true,
                element: <OrdersPage />,
              },
              {
                path: "new",
                element: <CreateOrderPage />,
              },
            ],
          },
          {
            path: "menu-items",
            element: <MenuItemsPage />,
          },
          {
            path: "categories",
            element: <CategoriesPage />,
          },
          {
            path: "payments",
            element: <PaymentsPage />,
          },
          {
            element: <AdminRoute />,
            children: [
              {
                element: <AdminRoute />,
                children: [
                  {
                    path: "health",
                    element: <HealthPage />,
                  },
                  {
                    path: "users",
                    element: <UsersPage />,
                  },
                ],
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
