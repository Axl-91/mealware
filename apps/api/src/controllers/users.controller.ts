import type { FastifyReply, FastifyRequest } from "fastify";
import { createUserSchema, updateUserSchema } from "@mealware/shared";
import * as usersService from "../services/users.service.js";
import { ZodError } from "zod";

const validationError = (reply: FastifyReply, error: ZodError) => {
  return reply.status(400).send({
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: error.issues,
    },
  });
};

const userNotFound = (reply: FastifyReply) => {
  return reply.status(404).send({
    error: {
      code: "USER_NOT_FOUND",
      message: "User not found",
    },
  });
};

const emailAlreadyExists = (reply: FastifyReply) => {
  return reply.status(409).send({
    error: {
      code: "EMAIL_ALREADY_EXISTS",
      message: "Email already exists",
    },
  });
};

export const createUserController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const validation = createUserSchema.safeParse(request.body);

  if (!validation.success) {
    return validationError(reply, validation.error);
  }

  const user = await usersService.createUser(
    validation.data,
    request.user.restaurantId,
  );

  if (!user) {
    return emailAlreadyExists(reply);
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
    return userNotFound(reply);
  }

  return reply.status(200).send({ user });
};

export const updateUserController = async (
  request: FastifyRequest<{ Params: UserIdParams }>,
  reply: FastifyReply,
) => {
  const validation = updateUserSchema.safeParse(request.body);

  if (!validation.success) {
    return validationError(reply, validation.error);
  }

  const result = await usersService.updateUser(
    request.params.id,
    request.user.restaurantId,
    validation.data,
  );

  if (result.status === "not_found") {
    return userNotFound(reply);
  }

  if (result.status === "email_exists") {
    return emailAlreadyExists(reply);
  }

  return reply.status(200).send({
    user: result.user,
  });
};

export const deactivateUserController = async (
  request: FastifyRequest<{ Params: UserIdParams }>,
  reply: FastifyReply,
) => {
  const user = await usersService.deactivateUser(
    request.params.id,
    request.user.restaurantId,
  );

  if (!user) {
    return userNotFound(reply);
  }

  return reply.status(200).send({
    message: "User deactivated successfully",
  });
};
