import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("DELETE /api/v1/menu-items/:id", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let otherAdmin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let categoryId: string;

  let menuItemId: string;
  let inactiveMenuItemId: string;
  let otherRestaurantMenuItemId: string;

  const menuItemIds: string[] = [];
  const categoryIds: string[] = [];

  const createCategory = async (name: string, cookie: string) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: { cookie },
      payload: { name },
    });

    expect(response.statusCode).toBe(201);

    const category = response.json().category;
    categoryIds.push(category.id);

    return category;
  };

  const createMenuItem = async ({
    restaurantId,
    categoryId,
    isActive = true,
  }: {
    restaurantId: string;
    categoryId: string;
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
        is_available: true,
        is_active: isActive,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    menuItemIds.push(menuItem.id);

    return menuItem;
  };

  const deactivateMenuItem = async (id: string, cookie: string) => {
    return app.inject({
      method: "DELETE",
      url: `/api/v1/menu-items/${id}`,
      headers: { cookie },
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
      admin.cookie,
    );

    categoryId = category.id;

    const menuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId,
    });

    menuItemId = menuItem.id;

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

  it("should deactivate a menu item successfully", async () => {
    const response = await deactivateMenuItem(menuItemId, admin.cookie);

    expect(response.statusCode).toBe(200);

    expect(response.json()).toMatchObject({
      message: "Menu item deactivated successfully",
    });

    const menuItem = await db
      .selectFrom("menu_items")
      .select(["id", "is_active"])
      .where("id", "=", menuItemId)
      .executeTakeFirstOrThrow();

    expect(menuItem.is_active).toBe(false);
  });

  it("should return 403 when an employee tries to deactivate a menu item", async () => {
    const response = await deactivateMenuItem(menuItemId, employee.cookie);

    expect(response.statusCode).toBe(403);
  });

  it("should return 404 when the menu item belongs to another restaurant", async () => {
    const response = await deactivateMenuItem(
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

  it("should return 404 when the menu item does not exist", async () => {
    const response = await deactivateMenuItem(randomUUID(), admin.cookie);

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "MENU_ITEM_NOT_FOUND",
        message: "Menu item not found",
      },
    });
  });

  it("should return 404 when the menu item is already inactive", async () => {
    const response = await deactivateMenuItem(inactiveMenuItemId, admin.cookie);

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
      method: "DELETE",
      url: `/api/v1/menu-items/${menuItemId}`,
    });

    expect(response.statusCode).toBe(401);
  });
});
