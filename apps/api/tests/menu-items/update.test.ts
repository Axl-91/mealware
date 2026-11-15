import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("PUT /api/v1/menu-items/:id", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let otherAdmin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let categoryId: string;
  let anotherCategoryId: string;
  let inactiveCategoryId: string;

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
    name,
    isActive = true,
  }: {
    restaurantId: string;
    categoryId: string;
    name?: string;
    isActive?: boolean;
  }) => {
    const menuItem = await db
      .insertInto("menu_items")
      .values({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name: name ?? `Test menu item ${randomUUID()}`,
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

  const updateMenuItem = async (
    id: string,
    payload: {
      categoryId: string;
      name: string;
      description: string | null;
      price: number;
    },
    cookie: string,
  ) => {
    return app.inject({
      method: "PUT",
      url: `/api/v1/menu-items/${id}`,
      headers: { cookie },
      payload,
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

    const anotherCategory = await createCategory(
      `Another menu items category ${randomUUID()}`,
      admin.cookie,
    );
    anotherCategoryId = anotherCategory.id;

    const inactiveCategory = await createCategory(
      `Inactive menu items category ${randomUUID()}`,
      admin.cookie,
    );
    inactiveCategoryId = inactiveCategory.id;

    const deactivateCategoryResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/categories/${inactiveCategoryId}`,
      headers: { cookie: admin.cookie },
    });

    expect(deactivateCategoryResponse.statusCode).toBe(200);

    const menuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId,
    });
    menuItemId = menuItem.id;

    await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId,
      name: "Existing menu item",
    });

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

  it("should update a menu item successfully", async () => {
    const updatedData = {
      categoryId: anotherCategoryId,
      name: "Updated menu item",
      description: "Updated menu item description",
      price: randomPrice(),
    };

    const response = await updateMenuItem(
      menuItemId,
      updatedData,
      admin.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json().menuItem).toMatchObject({
      id: menuItemId,
      restaurant_id: admin.user.restaurant_id,
      category_id: anotherCategoryId,
      name: updatedData.name,
      description: updatedData.description,
      price: updatedData.price.toFixed(2),
      is_available: true,
      is_active: true,
    });
  });

  it("should return 403 when an employee tries to update a menu item", async () => {
    const response = await updateMenuItem(
      menuItemId,
      {
        categoryId,
        name: "Unauthorized update",
        description: null,
        price: randomPrice(),
      },
      employee.cookie,
    );

    expect(response.statusCode).toBe(403);
  });

  it("should return 404 when the menu item belongs to another restaurant", async () => {
    const response = await updateMenuItem(
      otherRestaurantMenuItemId,
      {
        categoryId,
        name: "Unauthorized restaurant update",
        description: null,
        price: randomPrice(),
      },
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
    const response = await updateMenuItem(
      randomUUID(),
      {
        categoryId,
        name: "Updated menu item",
        description: null,
        price: randomPrice(),
      },
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
    const response = await updateMenuItem(
      inactiveMenuItemId,
      {
        categoryId,
        name: "Updated inactive menu item",
        description: null,
        price: randomPrice(),
      },
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

  it("should return 404 when the category does not exist", async () => {
    const response = await updateMenuItem(
      menuItemId,
      {
        categoryId: randomUUID(),
        name: "Updated menu item",
        description: null,
        price: randomPrice(),
      },
      admin.cookie,
    );

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found",
      },
    });
  });

  it("should return 404 when the category is inactive", async () => {
    const response = await updateMenuItem(
      menuItemId,
      {
        categoryId: inactiveCategoryId,
        name: "Updated menu item",
        description: null,
        price: randomPrice(),
      },
      admin.cookie,
    );

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found",
      },
    });
  });

  it("should return 409 when the name already exists in the restaurant", async () => {
    const response = await updateMenuItem(
      menuItemId,
      {
        categoryId,
        name: "Existing menu item",
        description: null,
        price: randomPrice(),
      },
      admin.cookie,
    );

    expect(response.statusCode).toBe(409);

    expect(response.json()).toMatchObject({
      error: {
        code: "MENU_ITEM_NAME_ALREADY_EXISTS",
      },
    });
  });

  it.each([
    ["an empty name", "   ", 10],
    ["a negative price", "Invalid menu item", -1],
    ["a price with more than two decimal places", "Invalid menu item", 10.999],
  ])(
    "should return 400 when the request contains %s",
    async (_, name, price) => {
      const response = await updateMenuItem(
        menuItemId,
        {
          categoryId,
          name,
          description: null,
          price,
        },
        admin.cookie,
      );

      expect(response.statusCode).toBe(400);
    },
  );

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/menu-items/${menuItemId}`,
      payload: {
        categoryId,
        name: "Unauthorized update",
        description: null,
        price: randomPrice(),
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
