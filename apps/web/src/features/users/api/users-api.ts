import type { CreateUserInput, UpdateUserInput } from "@mealware/shared";
import { apiRequest } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetUsersResponse {
  users: User[];
}

export interface GetUserResponse {
  user: User;
}

export interface CreateUserResponse {
  user: User;
}

export interface UpdateUserResponse {
  user: User;
}

export interface UserActionResponse {
  message: string;
}

export const getUsers = () => apiRequest<GetUsersResponse>("/users");

export const getUserById = (userId: string) =>
  apiRequest<GetUserResponse>(`/users/${userId}`);

export const createUser = (input: CreateUserInput) =>
  apiRequest<CreateUserResponse>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateUser = (userId: string, input: UpdateUserInput) =>
  apiRequest<UpdateUserResponse>(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

export const deactivateUser = (userId: string) =>
  apiRequest<UserActionResponse>(`/users/${userId}`, {
    method: "DELETE",
  });
