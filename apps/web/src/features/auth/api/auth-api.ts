import { USER_ROLES } from "@mealware/shared";
import { apiRequest } from "@/lib/api";

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
}

export interface MeResponse {
  user: AuthUser;
}

export interface LogoutResponse {
  message: string;
}

export const login = (data: LoginRequest) =>
  apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMe = () => apiRequest<MeResponse>("/auth/me");

export const logout = () =>
  apiRequest<LogoutResponse>("/auth/logout", {
    method: "POST",
  });
