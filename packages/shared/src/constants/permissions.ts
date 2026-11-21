import { USER_ROLES } from "./user.js";

// Users
export const USERS_CREATE_ROLES = [USER_ROLES.ADMIN] as const;
export const USERS_READ_ROLES = [USER_ROLES.ADMIN] as const;
export const USERS_UPDATE_ROLES = [USER_ROLES.ADMIN] as const;
export const USERS_DEACTIVATE_ROLES = [USER_ROLES.ADMIN] as const;

// Categories
export const CATEGORIES_CREATE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.EMPLOYEE,
] as const;

export const CATEGORIES_READ_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.EMPLOYEE,
] as const;

export const CATEGORIES_UPDATE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.EMPLOYEE,
] as const;

export const CATEGORIES_DEACTIVATE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.EMPLOYEE,
] as const;

export const CATEGORIES_REACTIVATE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.EMPLOYEE,
] as const;

// Menu items
export const MENU_ITEMS_CREATE_ROLES = [USER_ROLES.ADMIN] as const;

export const MENU_ITEMS_READ_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.EMPLOYEE,
] as const;

export const MENU_ITEMS_UPDATE_ROLES = [USER_ROLES.ADMIN] as const;

export const MENU_ITEMS_DEACTIVATE_ROLES = [USER_ROLES.ADMIN] as const;

export const MENU_ITEMS_REACTIVATE_ROLES = [USER_ROLES.ADMIN] as const;

// Orders
export const ORDERS_CREATE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.EMPLOYEE,
] as const;

export const ORDERS_READ_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.EMPLOYEE,
] as const;

export const ORDERS_UPDATE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.EMPLOYEE,
] as const;

export const ORDERS_STATUS_UPDATE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.EMPLOYEE,
] as const;

// Payments
export const PAYMENTS_ROLES = [USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE] as const;

// Refunds
export const REFUNDS_ROLES = [USER_ROLES.ADMIN] as const;
