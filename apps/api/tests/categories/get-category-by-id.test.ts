import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";

describe("GET /api/v1/categories/:id", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let employeeCategoryId: string;
  let adminCategoryId: string;
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

  const getCategoryById = async (categoryId: string, cookie: string) => {
    return app.inject({
      method: "GET",
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
      "Employee category by ID",
      employee.cookie,
    );

    employeeCategoryId = employeeCategory.id;

    const adminCategory = await createCategory(
      "Admin category by ID",
      admin.cookie,
    );

    adminCategoryId = adminCategory.id;

    const inactiveCategory = await createCategory(
      "Inactive category by ID",
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

  it("should return a category created by the authenticated user", async () => {
    const response = await getCategoryById(employeeCategoryId, employee.cookie);

    expect(response.statusCode).toBe(200);

    expect(response.json().category).toMatchObject({
      id: employeeCategoryId,
      name: "Employee category by ID",
      created_by: employee.user.id,
      is_active: true,
    });
  });

  it("should return a category created by a user from another restaurant", async () => {
    const response = await getCategoryById(employeeCategoryId, admin.cookie);

    expect(response.statusCode).toBe(200);

    expect(response.json().category).toMatchObject({
      id: employeeCategoryId,
      name: "Employee category by ID",
      created_by: employee.user.id,
      is_active: true,
    });
  });

  it("should return 404 when the category does not exist", async () => {
    const response = await getCategoryById(randomUUID(), employee.cookie);

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found",
      },
    });
  });

  it("should return 404 when the category is inactive", async () => {
    const response = await getCategoryById(inactiveCategoryId, employee.cookie);

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
      method: "GET",
      url: `/api/v1/categories/${adminCategoryId}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return a category created by an admin when requested by an employee", async () => {
    const response = await getCategoryById(adminCategoryId, employee.cookie);

    expect(response.statusCode).toBe(200);

    expect(response.json().category).toMatchObject({
      id: adminCategoryId,
      name: "Admin category by ID",
      created_by: admin.user.id,
      is_active: true,
    });
  });
});
