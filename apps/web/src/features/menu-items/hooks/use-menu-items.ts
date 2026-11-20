import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "@mealware/shared";
import {
  createMenuItem,
  deactivateMenuItem,
  getMenuItems,
  updateMenuItem,
} from "../api/menu-items-api";

export const MENU_ITEMS_QUERY_KEY = ["menu-items"];

export function useMenuItems() {
  return useQuery({
    queryKey: MENU_ITEMS_QUERY_KEY,
    queryFn: getMenuItems,
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMenuItemInput) => createMenuItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MENU_ITEMS_QUERY_KEY,
      });
    },
  });
}

interface UpdateMenuItemMutationInput {
  menuItemId: string;
  input: UpdateMenuItemInput;
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ menuItemId, input }: UpdateMenuItemMutationInput) =>
      updateMenuItem(menuItemId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MENU_ITEMS_QUERY_KEY,
      });
    },
  });
}

export function useDeactivateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (menuItemId: string) => deactivateMenuItem(menuItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MENU_ITEMS_QUERY_KEY,
      });
    },
  });
}
