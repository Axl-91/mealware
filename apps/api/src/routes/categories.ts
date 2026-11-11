import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../auth/authenticate.js";
import {
  createCategoryController,
  getCategoriesController,
  getCategoryByIdController,
  updateCategoryController,
  deactivateCategoryController,
} from "../controllers/categories.controller.js";

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  const authenticated = {
    preHandler: [authenticate],
  };

  // POST /categories - Create category
  app.post("/", authenticated, createCategoryController);

  // GET /categories - List active categories
  app.get("/", authenticated, getCategoriesController);

  // GET /categories/:id - Get category by ID
  app.get<{ Params: { id: string } }>(
    "/:id",
    authenticated,
    getCategoryByIdController,
  );

  // PUT /categories/:id - Update category
  app.put<{ Params: { id: string } }>(
    "/:id",
    authenticated,
    updateCategoryController,
  );

  // DELETE /categories/:id - Deactivate category
  app.delete<{ Params: { id: string } }>(
    "/:id",
    authenticated,
    deactivateCategoryController,
  );
};
