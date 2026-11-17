import { USER_ROLES } from "./user.js";

export const USERS_CREATE_ROLES = [USER_ROLES.ADMIN] as const;

export const USERS_READ_ROLES = [USER_ROLES.ADMIN] as const;

export const MENU_ITEMS_MANAGE_ROLES = [USER_ROLES.ADMIN] as const;

export const PAYMENTS_ROLES = [USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE] as const;

export const REFUNDS_ROLES = [USER_ROLES.ADMIN] as const;
