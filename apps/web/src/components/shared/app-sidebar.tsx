import {
  Activity,
  CreditCard,
  Layers,
  LayoutDashboard,
  ShoppingBag,
  Utensils,
  Users,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { USER_ROLES } from "@mealware/shared";
import { NavLink, useLocation } from "react-router";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavigationItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

const navigation: NavigationGroup[] = [
  {
    title: "General",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Pedidos", url: "/orders", icon: ShoppingBag },
      { title: "Productos", url: "/menu-items", icon: Utensils },
      { title: "Categorías", url: "/categories", icon: Layers },
    ],
  },
  {
    title: "Administración",
    items: [
      { title: "Pagos", url: "/payments", icon: CreditCard },
      { title: "Usuarios", url: "/users", icon: Users },
      {
        title: "Estado del sistema",
        url: "/health",
        icon: Activity,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Mi cuenta",
    items: [{ title: "Mi Perfil", url: "/account", icon: UserRound }],
  },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { data } = useAuth();

  const isAdmin = data?.user.role === USER_ROLES.ADMIN;

  const isRouteActive = (url: string) =>
    url === "/"
      ? pathname === "/"
      : pathname === url || pathname.startsWith(`${url}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center px-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Utensils size={18} />
          </div>
          <span className="text-lg font-bold group-data-[collapsible=icon]:hidden">
            Mealware
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || isAdmin,
          );

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isRouteActive(item.url)}
                      >
                        <NavLink to={item.url} end={item.url === "/"}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
