import { z } from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createCategorySchema, updateCategorySchema } from "@mealware/shared";
import * as categoriesService from "../services/categories.service.js";
import { validationError, forbidden } from "../utils/http-errors.js";

const getCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(["active", "archived"]).default("active"),
});

const categoryNotFound = (reply: FastifyReply) => {
  return reply.status(404).send({
    error: {
      code: "CATEGORY_NOT_FOUND",
      message: "Category not found",
    },
  });
};

const categoryNameAlreadyExists = (reply: FastifyReply) => {
  return reply.status(409).send({
    error: {
      code: "CATEGORY_NAME_ALREADY_EXISTS",
      message: "Category name already exists",
    },
  });
};

const categoryInUse = (reply: FastifyReply) => {
  return reply.status(409).send({
    error: {
      code: "CATEGORY_IN_USE",
      message:
        "Category cannot be deactivated because it has active menu items",
    },
  });
};

export const createCategoryController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const validation = createCategorySchema.safeParse(request.body);

  if (!validation.success) {
    return validationError(reply, validation.error);
  }

  const category = await categoriesService.createCategory(
    validation.data,
    request.user.sub,
  );

  if (!category) {
    return categoryNameAlreadyExists(reply);
  }

  return reply.status(201).send({ category });
};

interface GetCategoriesQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
}

export const getCategoriesController = async (
  request: FastifyRequest<{ Querystring: GetCategoriesQuery }>,
  reply: FastifyReply,
) => {
  const validation = getCategoriesQuerySchema.safeParse(request.query);

  if (!validation.success) {
    return validationError(reply, validation.error);
  }

  const result = await categoriesService.getCategoriesPaginated(
    validation.data,
  );

  return reply.status(200).send(result);
};

interface CategoryIdParams {
  id: string;
}

export const getCategoryByIdController = async (
  request: FastifyRequest<{ Params: CategoryIdParams }>,
  reply: FastifyReply,
) => {
  const category = await categoriesService.getCategoryById(request.params.id);

  if (!category) {
    return categoryNotFound(reply);
  }

  return reply.status(200).send({ category });
};

export const updateCategoryController = async (
  request: FastifyRequest<{ Params: CategoryIdParams }>,
  reply: FastifyReply,
) => {
  const validation = updateCategorySchema.safeParse(request.body);

  if (!validation.success) {
    return validationError(reply, validation.error);
  }

  const result = await categoriesService.updateCategory(
    request.params.id,
    request.user.sub,
    validation.data,
  );

  if (result.status === "not_found") {
    return categoryNotFound(reply);
  }

  if (result.status === "forbidden") {
    return forbidden(reply);
  }

  if (result.status === "name_exists") {
    return categoryNameAlreadyExists(reply);
  }

  return reply.status(200).send({
    category: result.category,
  });
};

export const deactivateCategoryController = async (
  request: FastifyRequest<{ Params: CategoryIdParams }>,
  reply: FastifyReply,
) => {
  const result = await categoriesService.deactivateCategory(
    request.params.id,
    request.user.sub,
  );

  if (result.status === "not_found") {
    return categoryNotFound(reply);
  }

  if (result.status === "forbidden") {
    return forbidden(reply);
  }

  if (result.status === "in_use") {
    return categoryInUse(reply);
  }

  return reply.status(200).send({
    message: "Category deactivated successfully",
  });
};

export const reactivateCategoryController = async (
  request: FastifyRequest<{ Params: CategoryIdParams }>,
  reply: FastifyReply,
) => {
  const result = await categoriesService.reactivateCategory(
    request.params.id,
    request.user.sub,
  );

  if (result.status === "not_found") {
    return categoryNotFound(reply);
  }

  if (result.status === "forbidden") {
    return forbidden(reply);
  }

  return reply.status(200).send({
    message:
      result.status === "already_active"
        ? "Category is already active"
        : "Category reactivated successfully",
  });
};
