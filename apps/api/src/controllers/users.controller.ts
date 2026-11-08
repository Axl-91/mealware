import type { FastifyReply, FastifyRequest } from "fastify";
import { createUserSchema, updateUserSchema } from "@mealware/shared";
import * as usersService from "../services/users.service.js";

export const createUserController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const validation = createUserSchema.safeParse(request.body);

  if (!validation.success) {
    return reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: validation.error.issues,
      },
    });
  }

  const user = await usersService.createUser(
    validation.data,
    request.user.restaurantId,
  );

  if (!user) {
    return reply.status(409).send({
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "A user with this email already exists",
      },
    });
  }

  return reply.status(201).send({ user });
};

export const getUsersController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const users = await usersService.getUsers(request.user.restaurantId);

  return reply.status(200).send({ users });
};

interface UserIdParams {
  id: string;
}

export const getUserByIdController = async (
  request: FastifyRequest<{ Params: UserIdParams }>,
  reply: FastifyReply,
) => {
  const user = await usersService.getUserById(
    request.params.id,
    request.user.restaurantId,
  );

  if (!user) {
    return reply.status(404).send({
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found",
      },
    });
  }

  return reply.status(200).send({ user });
};

export const updateUserController = async (
  request: FastifyRequest<{ Params: UserIdParams }>,
  reply: FastifyReply,
) => {
  const validation = updateUserSchema.safeParse(request.body);

  if (!validation.success) {
    return reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: validation.error.issues,
      },
    });
  }

  const result = await usersService.updateUser(
    request.params.id,
    request.user.restaurantId,
    validation.data,
  );

  if (result.status === "not_found") {
    return reply.status(404).send({
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found",
      },
    });
  }

  if (result.status === "email_exists") {
    return reply.status(409).send({
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "A user with this email already exists",
      },
    });
  }

  return reply.status(200).send({
    user: result.user,
  });
};
