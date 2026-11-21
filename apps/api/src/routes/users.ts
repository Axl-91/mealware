import type { FastifyPluginAsync } from "fastify";
import {
  USERS_CREATE_ROLES,
  USERS_READ_ROLES,
  USERS_UPDATE_ROLES,
  USERS_DEACTIVATE_ROLES,
} from "@mealware/shared";
import { authenticate } from "../auth/authenticate.js";
import { authorize } from "../auth/authorize.js";
import {
  createUserController,
  getUsersController,
  getUserByIdController,
  updateUserController,
  deactivateUserController,
} from "../controllers/users.controller.js";

export const usersRoutes: FastifyPluginAsync = async (app) => {
  const createAccess = {
    preHandler: [authenticate, authorize(...USERS_CREATE_ROLES)],
  };

  const readAccess = {
    preHandler: [authenticate, authorize(...USERS_READ_ROLES)],
  };

  const updateAccess = {
    preHandler: [authenticate, authorize(...USERS_UPDATE_ROLES)],
  };

  const deactivateAccess = {
    preHandler: [authenticate, authorize(...USERS_DEACTIVATE_ROLES)],
  };

  // POST /users - Create user
  app.post("/", createAccess, createUserController);

  // GET /users - List active users
  app.get("/", readAccess, getUsersController);

  // GET /users/:id - Get user by ID
  app.get<{ Params: { id: string } }>(
    "/:id",
    readAccess,
    getUserByIdController,
  );

  // PUT /users/:id - Update user
  app.put<{ Params: { id: string } }>(
    "/:id",
    updateAccess,
    updateUserController,
  );

  // DELETE /users/:id - Deactivate user
  app.delete<{ Params: { id: string } }>(
    "/:id",
    deactivateAccess,
    deactivateUserController,
  );
};
