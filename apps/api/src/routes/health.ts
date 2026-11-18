import type { FastifyPluginAsync } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../database/database.js";

const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("mealware-api"),
});

const readinessOkSchema = z.object({
  status: z.literal("ok"),
  checks: z.object({
    database: z.literal("ok"),
  }),
});

const readinessErrorSchema = z.object({
  status: z.literal("error"),
  checks: z.object({
    database: z.literal("error"),
  }),
});

export const healthRoutes: FastifyPluginAsync = async (app) => {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get(
    "/",
    {
      schema: {
        response: {
          200: healthSchema,
        },
      },
    },
    async () => {
      return {
        status: "ok" as const,
        service: "mealware-api" as const,
      };
    },
  );

  api.get(
    "/ready",
    {
      schema: {
        response: {
          200: readinessOkSchema,
          503: readinessErrorSchema,
        },
      },
    },
    async (_request, reply) => {
      try {
        await sql`SELECT 1`.execute(db);

        return {
          status: "ok" as const,
          checks: {
            database: "ok" as const,
          },
        };
      } catch (error) {
        app.log.error({ err: error }, "Database readiness check failed");

        return reply.status(503).send({
          status: "error" as const,
          checks: {
            database: "error" as const,
          },
        });
      }
    },
  );
};
