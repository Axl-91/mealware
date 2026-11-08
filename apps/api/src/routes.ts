import type { FastifyPluginAsync } from "fastify";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { usersRoutes } from "./routes/users.js";

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
    },
    {
      prefix: "/api/v1",
    },
  );
};
