import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@mealware/shared";

export const authorize = (...allowedRoles: UserRole[]) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to perform this action",
        },
      });
    }
  };
};
