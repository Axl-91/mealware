import type {
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "@mealware/shared";
import { apiRequest } from "@/lib/api";

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  is_active: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetMenuItemsResponse {
  menuItems: MenuItem[];
}

export interface GetMenuItemResponse {
  menuItem: MenuItem;
}

export interface CreateMenuItemResponse {
  menuItem: MenuItem;
}

export interface UpdateMenuItemResponse {
  menuItem: MenuItem;
}

export interface MenuItemActionResponse {
  message: string;
}

export const getMenuItems = () =>
  apiRequest<GetMenuItemsResponse>("/menu-items");

export const getMenuItemById = (menuItemId: string) =>
  apiRequest<GetMenuItemResponse>(`/menu-items/${menuItemId}`);

export const createMenuItem = (input: CreateMenuItemInput) =>
  apiRequest<CreateMenuItemResponse>("/menu-items", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateMenuItem = (
  menuItemId: string,
  input: UpdateMenuItemInput,
) =>
  apiRequest<UpdateMenuItemResponse>(`/menu-items/${menuItemId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

export const deactivateMenuItem = (menuItemId: string) =>
  apiRequest<MenuItemActionResponse>(`/menu-items/${menuItemId}`, {
    method: "DELETE",
  });
