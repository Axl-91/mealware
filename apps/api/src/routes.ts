import type { FastifyPluginAsync } from "fastify";
import { healthRoutes } from "./routes/health.js";

export const routes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes, {
    prefix: "/health",
  });
};
