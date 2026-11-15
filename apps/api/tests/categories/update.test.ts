import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";

describe("PUT /api/v1/categories/:id", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let employeeCategoryId: string;
  let inactiveCategoryId: string;

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

  const updateCategory = async (
    categoryId: string,
    name: string,
    cookie: string,
  ) => {
    return app.inject({
      method: "PUT",
      url: `/api/v1/categories/${categoryId}`,
      headers: {
        cookie,
      },
      payload: {
        name,
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
      "Category to update",
      employee.cookie,
    );

    employeeCategoryId = employeeCategory.id;

    await createCategory("Existing category", admin.cookie);

    const inactiveCategory = await createCategory(
      "Inactive category",
      employee.cookie,
    );

    inactiveCategoryId = inactiveCategory.id;

    const deactivateResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/categories/${inactiveCategoryId}`,
      headers: {
        cookie: employee.cookie,
      },
    });

    expect(deactivateResponse.statusCode).toBe(200);
  });

  afterAll(async () => {
    await cleanupTestData({ categoryIds });

    await employee.cleanup();
    await admin.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should update a category created by the authenticated user", async () => {
    const response = await updateCategory(
      employeeCategoryId,
      "Updated   category",
      employee.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json().category).toMatchObject({
      id: employeeCategoryId,
      name: "Updated category",
      created_by: employee.user.id,
      is_active: true,
    });
  });

  it("should return 403 when another user tries to update the category", async () => {
    const response = await updateCategory(
      employeeCategoryId,
      "Unauthorized update",
      admin.cookie,
    );

    expect(response.statusCode).toBe(403);
  });

  it("should return 404 when the category does not exist", async () => {
    const response = await updateCategory(
      randomUUID(),
      "Updated category",
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

  it("should return 404 when the category is inactive", async () => {
    const response = await updateCategory(
      inactiveCategoryId,
      "Updated inactive category",
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

  it.each([
    ["an empty name", "   "],
    ["a name containing a period", "Invalid.category"],
  ])("should return 400 when the name is invalid (%s)", async (_, name) => {
    const response = await updateCategory(
      employeeCategoryId,
      name,
      employee.cookie,
    );

    expect(response.statusCode).toBe(400);
  });

  it("should return 409 when the name already exists", async () => {
    const response = await updateCategory(
      employeeCategoryId,
      "Existing category",
      employee.cookie,
    );

    expect(response.statusCode).toBe(409);

    expect(response.json()).toMatchObject({
      error: {
        code: "CATEGORY_NAME_ALREADY_EXISTS",
      },
    });
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/categories/${employeeCategoryId}`,
      payload: {
        name: "Unauthorized update",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
