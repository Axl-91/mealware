import type { FastifyPluginAsync } from "fastify";
import { loginSchema } from "@mealware/shared";
import {
  authenticateUser,
  getAuthenticatedUser,
} from "../services/auth.service.js";
import { authenticate } from "../auth/authenticate.js";
import { env } from "../config/env.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (request, reply) => {
    const validation = loginSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: validation.error.issues,
        },
      });
    }

    const user = await authenticateUser(validation.data);

    if (!user) {
      return reply.status(401).send({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    const token = await reply.jwtSign(user);

    return reply
      .setCookie("mealware_token", token, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      })
      .status(200)
      .send({
        message: "Login successful",
      });
  });

  app.get(
    "/me",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = await getAuthenticatedUser({
        userId: request.user.sub,
        restaurantId: request.user.restaurantId,
      });

      if (!user) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        });
      }

      return reply.status(200).send({
        user,
      });
    },
  );

  app.post("/logout", async (_request, reply) => {
    return reply
      .clearCookie("mealware_token", {
        path: "/",
      })
      .status(200)
      .send({
        message: "Logout successful",
      });
  });
};
