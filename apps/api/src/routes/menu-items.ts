import type { FastifyPluginAsync } from "fastify";
import { USER_ROLES } from "@mealware/shared";
import { authenticate } from "../auth/authenticate.js";
import { authorize } from "../auth/authorize.js";
import {
  createMenuItemController,
  getMenuItemsController,
  getMenuItemByIdController,
  updateMenuItemController,
  deactivateMenuItemController,
} from "../controllers/menu-items.controller.js";

export const menuItemsRoutes: FastifyPluginAsync = async (app) => {
  const authenticated = { preHandler: [authenticate] };

  const adminOnly = {
    preHandler: [authenticate, authorize(USER_ROLES.ADMIN)],
  };

  // POST /menu-items - Create menu item (ADMIN only)
  app.post("/", adminOnly, createMenuItemController);

  // GET /menu-items - List active menu items (ADMIN and EMPLOYEE)
  app.get("/", authenticated, getMenuItemsController);

  // GET /menu-items/:id - Get menu item by ID (ADMIN and EMPLOYEE)
  app.get<{ Params: { id: string } }>(
    "/:id",
    authenticated,
    getMenuItemByIdController,
  );

  // PUT /menu-items/:id - Update menu item (ADMIN only)
  app.put<{ Params: { id: string } }>(
    "/:id",
    adminOnly,
    updateMenuItemController,
  );

  // DELETE /menu-items/:id - Deactivate menu item (ADMIN only)
  app.delete<{ Params: { id: string } }>(
    "/:id",
    adminOnly,
    deactivateMenuItemController,
  );
};
