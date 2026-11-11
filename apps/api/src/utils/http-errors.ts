import type { FastifyReply } from "fastify";
import { ZodError } from "zod";

export const validationError = (reply: FastifyReply, error: ZodError) => {
  return reply.status(400).send({
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: error.issues,
    },
  });
};

export const forbidden = (reply: FastifyReply) => {
  return reply.status(403).send({
    error: {
      code: "FORBIDDEN",
      message: "You are not allowed to perform this action",
    },
  });
};

export const unauthorized = (reply: FastifyReply) => {
  return reply.status(401).send({
    error: {
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    },
  });
};
