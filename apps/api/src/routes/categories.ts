import type { FastifyPluginAsync } from "fastify";
import {
  CATEGORIES_CREATE_ROLES,
  CATEGORIES_READ_ROLES,
  CATEGORIES_UPDATE_ROLES,
  CATEGORIES_DEACTIVATE_ROLES,
  CATEGORIES_REACTIVATE_ROLES,
} from "@mealware/shared";
import { authenticate } from "../auth/authenticate.js";
import { authorize } from "../auth/authorize.js";
import {
  createCategoryController,
  getCategoriesController,
  getCategoryByIdController,
  updateCategoryController,
  deactivateCategoryController,
  reactivateCategoryController,
} from "../controllers/categories.controller.js";

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  const createAccess = {
    preHandler: [authenticate, authorize(...CATEGORIES_CREATE_ROLES)],
  };

  const readAccess = {
    preHandler: [authenticate, authorize(...CATEGORIES_READ_ROLES)],
  };

  const updateAccess = {
    preHandler: [authenticate, authorize(...CATEGORIES_UPDATE_ROLES)],
  };

  const deactivateAccess = {
    preHandler: [authenticate, authorize(...CATEGORIES_DEACTIVATE_ROLES)],
  };

  const reactivateAccess = {
    preHandler: [authenticate, authorize(...CATEGORIES_REACTIVATE_ROLES)],
  };

  // POST /categories - Create category
  app.post("/", createAccess, createCategoryController);

  // GET /categories - List categories with pagination and filters
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
    };
  }>("/", readAccess, getCategoriesController);

  // GET /categories/:id - Get category by ID
  app.get<{ Params: { id: string } }>(
    "/:id",
    readAccess,
    getCategoryByIdController,
  );

  // PUT /categories/:id - Update category
  app.put<{ Params: { id: string } }>(
    "/:id",
    updateAccess,
    updateCategoryController,
  );

  // DELETE /categories/:id - Deactivate category
  app.delete<{ Params: { id: string } }>(
    "/:id",
    deactivateAccess,
    deactivateCategoryController,
  );

  // PUT /categories/:id/reactivate - Reactivate category
  app.put<{ Params: { id: string } }>(
    "/:id/reactivate",
    reactivateAccess,
    reactivateCategoryController,
  );
};
