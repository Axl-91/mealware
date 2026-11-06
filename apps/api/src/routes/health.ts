import type { FastifyPluginAsync } from "fastify";
import { sql } from "kysely";
import { db } from "../database.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => {
    return {
      status: "ok",
      service: "mealware-api",
    };
  });

  app.get("/ready", async (_request, reply) => {
    try {
      await sql`SELECT 1`.execute(db);

      return {
        status: "ok",
        checks: {
          database: "ok",
        },
      };
    } catch (error) {
      app.log.error({ err: error }, "Database readiness check failed");

      return reply.status(503).send({
        status: "error",
        checks: {
          database: "error",
        },
      });
    }
  });
};
