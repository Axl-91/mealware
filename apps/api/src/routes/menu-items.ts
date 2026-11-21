import type { FastifyPluginAsync } from "fastify";
import {
  MENU_ITEMS_CREATE_ROLES,
  MENU_ITEMS_READ_ROLES,
  MENU_ITEMS_UPDATE_ROLES,
  MENU_ITEMS_DEACTIVATE_ROLES,
  MENU_ITEMS_REACTIVATE_ROLES,
} from "@mealware/shared";
import { authenticate } from "../auth/authenticate.js";
import { authorize } from "../auth/authorize.js";
import {
  createMenuItemController,
  getMenuItemsController,
  getMenuItemByIdController,
  updateMenuItemController,
  deactivateMenuItemController,
  reactivateMenuItemController,
} from "../controllers/menu-items.controller.js";

export const menuItemsRoutes: FastifyPluginAsync = async (app) => {
  const createAccess = {
    preHandler: [authenticate, authorize(...MENU_ITEMS_CREATE_ROLES)],
  };

  const readAccess = {
    preHandler: [authenticate, authorize(...MENU_ITEMS_READ_ROLES)],
  };

  const updateAccess = {
    preHandler: [authenticate, authorize(...MENU_ITEMS_UPDATE_ROLES)],
  };

  const deactivateAccess = {
    preHandler: [authenticate, authorize(...MENU_ITEMS_DEACTIVATE_ROLES)],
  };

  const reactivateAccess = {
    preHandler: [authenticate, authorize(...MENU_ITEMS_REACTIVATE_ROLES)],
  };

  // POST /menu-items - Create menu item
  app.post("/", createAccess, createMenuItemController);

  // GET /menu-items - List menu items
  app.get("/", readAccess, getMenuItemsController);

  // GET /menu-items/:id - Get menu item by ID
  app.get<{ Params: { id: string } }>(
    "/:id",
    readAccess,
    getMenuItemByIdController,
  );

  // PUT /menu-items/:id - Update menu item
  app.put<{ Params: { id: string } }>(
    "/:id",
    updateAccess,
    updateMenuItemController,
  );

  // DELETE /menu-items/:id - Deactivate menu item
  app.delete<{ Params: { id: string } }>(
    "/:id",
    deactivateAccess,
    deactivateMenuItemController,
  );

  // PUT /menu-items/:id/reactivate - Reactivate menu item
  app.put<{ Params: { id: string } }>(
    "/:id/reactivate",
    reactivateAccess,
    reactivateMenuItemController,
  );
};
