import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("GET /api/v1/menu-items/:id", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let otherAdmin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let categoryId: string;

  let menuItemId: string;
  let unavailableMenuItemId: string;
  let inactiveMenuItemId: string;
  let otherRestaurantMenuItemId: string;

  const menuItemIds: string[] = [];
  const categoryIds: string[] = [];

  const createCategory = async (name: string, cookie: string) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: {
        cookie,
      },
      payload: {
        name,
      },
    });

    expect(response.statusCode).toBe(201);

    const category = response.json().category;
    categoryIds.push(category.id);

    return category;
  };

  const createMenuItem = async ({
    restaurantId,
    categoryId,
    isAvailable = true,
    isActive = true,
  }: {
    restaurantId: string;
    categoryId: string;
    isAvailable?: boolean;
    isActive?: boolean;
  }) => {
    const menuItem = await db
      .insertInto("menu_items")
      .values({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name: `Test menu item ${randomUUID()}`,
        description: null,
        price: randomPrice().toFixed(2),
        is_available: isAvailable,
        is_active: isActive,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    menuItemIds.push(menuItem.id);

    return menuItem;
  };

  const getMenuItemById = async (id: string, cookie: string) => {
    return app.inject({
      method: "GET",
      url: `/api/v1/menu-items/${id}`,
      headers: {
        cookie,
      },
    });
  };

  beforeAll(async () => {
    app = await appPromise;

    admin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    employee = await createTestUserWithAuth(app, {
      restaurantId: admin.user.restaurant_id,
      role: USER_ROLES.EMPLOYEE,
    });

    otherAdmin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    const category = await createCategory(
      `Menu items category ${randomUUID()}`,
      employee.cookie,
    );

    categoryId = category.id;

    const menuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId,
    });

    menuItemId = menuItem.id;

    const unavailableMenuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId,
      isAvailable: false,
    });

    unavailableMenuItemId = unavailableMenuItem.id;

    const inactiveMenuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId,
      isActive: false,
    });

    inactiveMenuItemId = inactiveMenuItem.id;

    const otherRestaurantMenuItem = await createMenuItem({
      restaurantId: otherAdmin.user.restaurant_id,
      categoryId,
    });

    otherRestaurantMenuItemId = otherRestaurantMenuItem.id;
  });

  afterAll(async () => {
    await cleanupTestData({
      menuItemIds,
      categoryIds,
    });

    await employee.cleanup();
    await admin.cleanup();
    await otherAdmin.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should return a menu item for an admin", async () => {
    const response = await getMenuItemById(menuItemId, admin.cookie);

    expect(response.statusCode).toBe(200);

    expect(response.json().menuItem).toMatchObject({
      id: menuItemId,
      restaurant_id: admin.user.restaurant_id,
      category_id: categoryId,
      is_available: true,
      is_active: true,
    });
  });

  it("should return a menu item for an employee", async () => {
    const response = await getMenuItemById(menuItemId, employee.cookie);

    expect(response.statusCode).toBe(200);

    expect(response.json().menuItem).toMatchObject({
      id: menuItemId,
      restaurant_id: admin.user.restaurant_id,
      category_id: categoryId,
      is_available: true,
      is_active: true,
    });
  });

  it("should return a menu item even when it is unavailable", async () => {
    const response = await getMenuItemById(
      unavailableMenuItemId,
      employee.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json().menuItem).toMatchObject({
      id: unavailableMenuItemId,
      is_available: false,
      is_active: true,
    });
  });

  it("should return 404 when the menu item belongs to another restaurant", async () => {
    const response = await getMenuItemById(
      otherRestaurantMenuItemId,
      admin.cookie,
    );

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "MENU_ITEM_NOT_FOUND",
        message: "Menu item not found",
      },
    });
  });

  it("should return 404 when the menu item is inactive", async () => {
    const response = await getMenuItemById(inactiveMenuItemId, employee.cookie);

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "MENU_ITEM_NOT_FOUND",
        message: "Menu item not found",
      },
    });
  });

  it("should return 404 when the menu item does not exist", async () => {
    const response = await getMenuItemById(randomUUID(), employee.cookie);

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "MENU_ITEM_NOT_FOUND",
        message: "Menu item not found",
      },
    });
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/menu-items/${menuItemId}`,
    });

    expect(response.statusCode).toBe(401);
  });
});
