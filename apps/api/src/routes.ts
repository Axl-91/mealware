import type { FastifyPluginAsync } from "fastify";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";

export const routes: FastifyPluginAsync = async (app) => {
  await app.register(
    async (api) => {
      await api.register(healthRoutes, {
        prefix: "/health",
      });

      await api.register(authRoutes, {
        prefix: "/auth",
      });
    },
    {
      prefix: "/api/v1",
    },
  );
};
