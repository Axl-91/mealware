import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("DELETE /api/v1/categories/:id", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let employeeCategoryId: string;
  let forbiddenCategoryId: string;
  let inactiveCategoryId: string;
  let categoryWithActiveItemId: string;
  let categoryWithInactiveItemId: string;

  const categoryIds: string[] = [];
  const menuItemIds: string[] = [];

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
    categoryId,
    isActive,
  }: {
    categoryId: string;
    isActive: boolean;
  }) => {
    const menuItem = await db
      .insertInto("menu_items")
      .values({
        restaurant_id: employee.user.restaurant_id,
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

  const deactivateCategory = async (categoryId: string, cookie: string) => {
    return app.inject({
      method: "DELETE",
      url: `/api/v1/categories/${categoryId}`,
      headers: {
        cookie,
      },
    });
  };

  beforeAll(async () => {
    app = await appPromise;

    employee = await createTestUserWithAuth(app);

    admin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    const employeeCategory = await createCategory(
      "Category to deactivate",
      employee.cookie,
    );

    employeeCategoryId = employeeCategory.id;

    const forbiddenCategory = await createCategory(
      "Category for forbidden test",
      employee.cookie,
    );

    forbiddenCategoryId = forbiddenCategory.id;

    const inactiveCategory = await createCategory(
      "Already inactive category",
      employee.cookie,
    );

    inactiveCategoryId = inactiveCategory.id;

    const categoryWithActiveItem = await createCategory(
      `Category with active item ${randomUUID()}`,
      employee.cookie,
    );

    categoryWithActiveItemId = categoryWithActiveItem.id;

    await createMenuItem({
      categoryId: categoryWithActiveItemId,
      isActive: true,
    });

    const categoryWithInactiveItem = await createCategory(
      `Category with inactive item ${randomUUID()}`,
      employee.cookie,
    );

    categoryWithInactiveItemId = categoryWithInactiveItem.id;

    await createMenuItem({
      categoryId: categoryWithInactiveItemId,
      isActive: false,
    });

    const deactivateResponse = await deactivateCategory(
      inactiveCategoryId,
      employee.cookie,
    );

    expect(deactivateResponse.statusCode).toBe(200);
  });

  afterAll(async () => {
    await cleanupTestData({
      menuItemIds,
      categoryIds,
    });

    await employee.cleanup();
    await admin.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should deactivate a category created by the authenticated user", async () => {
    const response = await deactivateCategory(
      employeeCategoryId,
      employee.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json()).toMatchObject({
      message: "Category deactivated successfully",
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/v1/categories/${employeeCategoryId}`,
      headers: {
        cookie: employee.cookie,
      },
    });

    expect(getResponse.statusCode).toBe(404);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        cookie: employee.cookie,
      },
    });

    expect(listResponse.statusCode).toBe(200);

    expect(
      listResponse
        .json()
        .categories.some(
          (category: { id: string }) => category.id === employeeCategoryId,
        ),
    ).toBe(false);
  });

  it("should return 403 when another user tries to deactivate the category", async () => {
    const response = await deactivateCategory(
      forbiddenCategoryId,
      admin.cookie,
    );

    expect(response.statusCode).toBe(403);
  });

  it("should return 409 when the category has active menu items", async () => {
    const response = await deactivateCategory(
      categoryWithActiveItemId,
      employee.cookie,
    );

    expect(response.statusCode).toBe(409);

    expect(response.json()).toMatchObject({
      error: {
        code: "CATEGORY_IN_USE",
        message:
          "Category cannot be deactivated because it has active menu items",
      },
    });

    const category = await db
      .selectFrom("categories")
      .select(["id", "is_active"])
      .where("id", "=", categoryWithActiveItemId)
      .executeTakeFirstOrThrow();

    expect(category.is_active).toBe(true);
  });

  it("should deactivate a category when it only has inactive menu items", async () => {
    const response = await deactivateCategory(
      categoryWithInactiveItemId,
      employee.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json()).toMatchObject({
      message: "Category deactivated successfully",
    });

    const category = await db
      .selectFrom("categories")
      .select(["id", "is_active"])
      .where("id", "=", categoryWithInactiveItemId)
      .executeTakeFirstOrThrow();

    expect(category.is_active).toBe(false);
  });

  it("should return 404 when the category does not exist", async () => {
    const response = await deactivateCategory(randomUUID(), employee.cookie);

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found",
      },
    });
  });

  it("should return 404 when the category is already inactive", async () => {
    const response = await deactivateCategory(
      inactiveCategoryId,
      employee.cookie,
    );

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found",
      },
    });
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/categories/${employeeCategoryId}`,
    });

    expect(response.statusCode).toBe(401);
  });
});
