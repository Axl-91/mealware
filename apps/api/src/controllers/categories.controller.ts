import type { FastifyReply, FastifyRequest } from "fastify";
import { createCategorySchema, updateCategorySchema } from "@mealware/shared";
import * as categoriesService from "../services/categories.service.js";
import { validationError, forbidden } from "../utils/http-errors.js";

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

export const getCategoriesController = async (
  _request: FastifyRequest,
  reply: FastifyReply,
) => {
  const categories = await categoriesService.getCategories();

  return reply.status(200).send({ categories });
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

  return reply.status(200).send({
    message: "Category deactivated successfully",
  });
};
