import { createBrowserRouter } from "react-router";
import AuthLayout from "./layouts/auth-layout";
import AppLayout from "./layouts/app-layout";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <div>Login</div>,
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
