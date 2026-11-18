import { createBrowserRouter } from "react-router";
import AuthLayout from "./layouts/auth-layout";
import AppLayout from "./layouts/app-layout";
import HealthPage from "@/features/health/pages/health-page";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <div>Login</div>,
      },
      {
        path: "health",
        element: <HealthPage />,
      },
    ],
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <div>Dashboard</div>,
      },
    ],
  },
]);
