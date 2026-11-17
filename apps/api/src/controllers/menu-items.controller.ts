import type { FastifyReply, FastifyRequest } from "fastify";
import { createMenuItemSchema, updateMenuItemSchema } from "@mealware/shared";
import { ZodError } from "zod";
import * as menuItemsService from "../services/menu-items.service.js";
import { conflict, notFound, validationError } from "../utils/http-errors.js";

interface MenuItemParams {
  id: string;
}

const menuItemNotFound = (reply: FastifyReply) => {
  return notFound(reply, "MENU_ITEM_NOT_FOUND", "Menu item not found");
};

const categoryNotFound = (reply: FastifyReply) => {
  return notFound(reply, "CATEGORY_NOT_FOUND", "Category not found");
};

const menuItemNameAlreadyExists = (reply: FastifyReply) => {
  return conflict(
    reply,
    "MENU_ITEM_NAME_ALREADY_EXISTS",
    "A menu item with this name already exists",
  );
};

export const createMenuItemController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const input = createMenuItemSchema.parse(request.body);

    const result = await menuItemsService.createMenuItem(
      input,
      request.user.restaurantId,
    );

    if (result.status === "category_not_found") {
      return categoryNotFound(reply);
    }

    if (result.status === "name_exists") {
      return menuItemNameAlreadyExists(reply);
    }

    return reply.status(201).send({
      menuItem: result.menuItem,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(reply, error);
    }

    throw error;
  }
};

export const getMenuItemsController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const menuItems = await menuItemsService.getMenuItems(
    request.user.restaurantId,
  );

  return reply.status(200).send({ menuItems });
};

export const getMenuItemByIdController = async (
  request: FastifyRequest<{ Params: MenuItemParams }>,
  reply: FastifyReply,
) => {
  const menuItem = await menuItemsService.getMenuItemById(
    request.params.id,
    request.user.restaurantId,
  );

  if (!menuItem) {
    return menuItemNotFound(reply);
  }

  return reply.status(200).send({ menuItem });
};

export const updateMenuItemController = async (
  request: FastifyRequest<{ Params: MenuItemParams }>,
  reply: FastifyReply,
) => {
  try {
    const input = updateMenuItemSchema.parse(request.body);

    const result = await menuItemsService.updateMenuItem(
      request.params.id,
      request.user.restaurantId,
      input,
    );

    if (result.status === "not_found") {
      return menuItemNotFound(reply);
    }

    if (result.status === "category_not_found") {
      return categoryNotFound(reply);
    }

    if (result.status === "name_exists") {
      return menuItemNameAlreadyExists(reply);
    }

    return reply.status(200).send({
      menuItem: result.menuItem,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(reply, error);
    }

    throw error;
  }
};

export const deactivateMenuItemController = async (
  request: FastifyRequest<{ Params: MenuItemParams }>,
  reply: FastifyReply,
) => {
  const result = await menuItemsService.deactivateMenuItem(
    request.params.id,
    request.user.restaurantId,
  );

  if (result.status === "not_found") {
    return menuItemNotFound(reply);
  }

  return reply.status(200).send({
    message: "Menu item deactivated successfully",
  });
};
