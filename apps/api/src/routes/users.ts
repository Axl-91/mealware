import type { FastifyPluginAsync } from "fastify";
import { USER_ROLES } from "@mealware/shared";
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
  const adminOnly = {
    preHandler: [authenticate, authorize(USER_ROLES.ADMIN)],
  };

  // POST /users - Create user
  app.post("/", adminOnly, createUserController);

  // GET /users - List active users
  app.get("/", adminOnly, getUsersController);

  // GET /users/:id - Get user by ID
  app.get<{ Params: { id: string } }>("/:id", adminOnly, getUserByIdController);

  // PUT /users/:id - Update user
  app.put<{ Params: { id: string } }>("/:id", adminOnly, updateUserController);

  // DELETE /users/:id - Deactivate user
  app.delete<{ Params: { id: string } }>(
    "/:id",
    adminOnly,
    deactivateUserController,
  );
};
