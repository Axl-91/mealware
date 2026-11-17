import type { FastifyPluginAsync } from "fastify";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { usersRoutes } from "./routes/users.js";
import { categoriesRoutes } from "./routes/categories.js";
import { menuItemsRoutes } from "./routes/menu-items.js";
import { ordersRoutes } from "./routes/orders.js";

export const routes: FastifyPluginAsync = async (app) => {
  await app.register(
    async (api) => {
      await api.register(healthRoutes, {
        prefix: "/health",
      });

      await api.register(authRoutes, {
        prefix: "/auth",
      });

      await api.register(usersRoutes, {
        prefix: "/users",
      });

      await api.register(categoriesRoutes, {
        prefix: "/categories",
      });

      await api.register(menuItemsRoutes, {
        prefix: "/menu-items",
      });

      await api.register(ordersRoutes, {
        prefix: "/orders",
      });
    },
    {
      prefix: "/api/v1",
    },
  );
};
