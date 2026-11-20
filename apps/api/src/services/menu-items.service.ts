import type {
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "@mealware/shared";
import * as menuItemsRepository from "../repositories/menu-items.repository.js";

type MenuItemStatus = "active" | "archived" | "all";

export const createMenuItem = async (
  input: CreateMenuItemInput,
  restaurantId: string,
) => {
  return menuItemsRepository.createMenuItem({
    ...input,
    restaurantId,
  });
};

export const getMenuItems = async (
  restaurantId: string,
  status: MenuItemStatus = "active",
) => {
  return menuItemsRepository.getMenuItems({
    restaurantId,
    status,
  });
};

export const getMenuItemById = async (
  menuItemId: string,
  restaurantId: string,
) => {
  return menuItemsRepository.getMenuItemById({
    menuItemId,
    restaurantId,
  });
};

export const updateMenuItem = async (
  menuItemId: string,
  restaurantId: string,
  input: UpdateMenuItemInput,
) => {
  return menuItemsRepository.updateMenuItem({
    menuItemId,
    restaurantId,
    ...input,
  });
};

export const deactivateMenuItem = async (
  menuItemId: string,
  restaurantId: string,
) => {
  return menuItemsRepository.deactivateMenuItem({
    menuItemId,
    restaurantId,
  });
};

export const reactivateMenuItem = async (
  menuItemId: string,
  restaurantId: string,
) => {
  return menuItemsRepository.reactivateMenuItem({
    menuItemId,
    restaurantId,
  });
};
