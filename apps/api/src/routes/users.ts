import type { FastifyPluginAsync } from "fastify";
import { createUserSchema, USER_ROLES } from "@mealware/shared";
import { authenticate } from "../auth/authenticate.js";
import { authorize } from "../auth/authorize.js";
import { createUser, getUsers } from "../services/users.service.js";

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/",
    {
      preHandler: [authenticate, authorize(USER_ROLES.ADMIN)],
    },
    async (request, reply) => {
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

      const user = await createUser(validation.data, request.user.restaurantId);

      if (!user) {
        return reply.status(409).send({
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "A user with this email already exists",
          },
        });
      }

      return reply.status(201).send({
        user,
      });
    },
  );

  app.get(
    "/",
    {
      preHandler: [authenticate, authorize(USER_ROLES.ADMIN)],
    },
    async (request, reply) => {
      const users = await getUsers(request.user.restaurantId);

      return reply.status(200).send({
        users,
      });
    },
  );
};
