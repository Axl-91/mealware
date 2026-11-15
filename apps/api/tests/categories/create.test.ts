import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";

describe("POST /api/v1/categories", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  const categoryIds: string[] = [];

  const createCategory = async (name: string, cookie: string) => {
    return app.inject({
      method: "POST",
      url: "/api/v1/categories",
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
  });

  afterAll(async () => {
    await cleanupTestData({ categoryIds });

    await employee.cleanup();
    await admin.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should create a category as an employee", async () => {
    const response = await createCategory(
      "  Bebidas   frias  ",
      employee.cookie,
    );

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.category).toMatchObject({
      name: "Bebidas frias",
      created_by: employee.user.id,
      is_active: true,
    });

    expect(body.category.id).toBeDefined();
    expect(body.category.created_at).toBeDefined();

    categoryIds.push(body.category.id);
  });

  it("should create a category as an admin", async () => {
    const response = await createCategory("Hamburguesas", admin.cookie);

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.category).toMatchObject({
      name: "Hamburguesas",
      created_by: admin.user.id,
      is_active: true,
    });

    expect(body.category.id).toBeDefined();

    categoryIds.push(body.category.id);
  });

  it("should return 400 when the category name is empty", async () => {
    const response = await createCategory("", employee.cookie);

    expect(response.statusCode).toBe(400);

    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("should return 400 when the category name contains a period", async () => {
    const response = await createCategory("Bebidas. Frias", employee.cookie);

    expect(response.statusCode).toBe(400);

    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("should return 409 when a category name already exists", async () => {
    const firstResponse = await createCategory("Postres", employee.cookie);

    expect(firstResponse.statusCode).toBe(201);

    const firstCategory = firstResponse.json().category;
    categoryIds.push(firstCategory.id);

    const secondResponse = await createCategory("  postres  ", admin.cookie);

    expect(secondResponse.statusCode).toBe(409);

    expect(secondResponse.json()).toMatchObject({
      error: {
        code: "CATEGORY_NAME_ALREADY_EXISTS",
        message: "Category name already exists",
      },
    });
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      payload: {
        name: "Sin autenticacion",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
