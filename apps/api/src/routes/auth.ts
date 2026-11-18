import type { FastifyPluginAsync } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { loginSchema } from "@mealware/shared";
import { authenticate } from "../auth/authenticate.js";
import {
  loginController,
  getMeController,
  logoutController,
} from "../controllers/auth.controller.js";

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()).optional(),
  }),
});

const messageSchema = z.object({
  message: z.string(),
});

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
});

const meSchema = z.object({
  user: userSchema,
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  const api = app.withTypeProvider<ZodTypeProvider>();

  // POST /auth/login - Authenticate user
  api.post(
    "/login",
    {
      attachValidation: true,
      schema: {
        body: loginSchema,
        response: {
          200: messageSchema,
          400: errorSchema,
          401: errorSchema,
        },
      },
    },
    loginController,
  );

  // GET /auth/me - Get authenticated user
  api.get(
    "/me",
    {
      schema: {
        security: [{ cookieAuth: [] }],
        response: {
          200: meSchema,
          401: errorSchema,
        },
      },
      preHandler: authenticate,
    },
    getMeController,
  );

  // POST /auth/logout - Logout user
  api.post(
    "/logout",
    {
      schema: {
        response: {
          200: messageSchema,
        },
      },
    },
    logoutController,
  );
};
