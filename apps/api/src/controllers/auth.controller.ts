import type { FastifyReply, FastifyRequest } from "fastify";
import { loginSchema } from "@mealware/shared";
import { env } from "../config/env.js";
import * as authService from "../services/auth.service.js";

export const loginController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const validation = loginSchema.safeParse(request.body);

  if (!validation.success) {
    return reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
      },
    });
  }

  const user = await authService.authenticateUser(validation.data);

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
      maxAge: 3600,
    })
    .status(200)
    .send({
      message: "Login successful",
    });
};

export const getMeController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const user = await authService.getAuthenticatedUser({
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

  return reply.status(200).send({ user });
};

export const logoutController = async (
  _request: FastifyRequest,
  reply: FastifyReply,
) => {
  return reply
    .clearCookie("mealware_token", {
      path: "/",
    })
    .status(200)
    .send({
      message: "Logout successful",
    });
};
