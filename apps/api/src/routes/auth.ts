import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../auth/authenticate.js";
import {
  loginController,
  getMeController,
  logoutController,
} from "../controllers/auth.controller.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/login - Authenticate user
  app.post("/login", loginController);

  // GET /auth/me - Get authenticated user
  app.get(
    "/me",
    {
      preHandler: authenticate,
    },
    getMeController,
  );

  // POST /auth/logout - Logout user
  app.post("/logout", logoutController);
};
