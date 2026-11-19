import { Outlet, useLocation, useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useLogout } from "@/features/auth/hooks/use-auth";

function AppLayout() {
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  const location = useLocation();

  const pageTitles: Record<string, string> = {
    "/": "Dashboard",
    "/health": "Estado del sistema",
    "/orders": "Pedidos",
    "/menu-items": "Productos",
    "/categories": "Categorías",
    "/payments": "Pagos",
    "/users": "Usuarios",
  };

  const pageTitle = pageTitles[location.pathname] ?? "Mealware";

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/login", { replace: true });
      },
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-2 md:px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger />

            <h1 className="text-xl font-bold">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppLayout;
