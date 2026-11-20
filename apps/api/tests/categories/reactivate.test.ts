import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";

describe("PUT /api/v1/categories/:id/reactivate", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let archivedCategoryId: string;
  let forbiddenCategoryId: string;
  let activeCategoryId: string;

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

  const deactivateCategory = async (categoryId: string) => {
    return app.inject({
      method: "DELETE",
      url: `/api/v1/categories/${categoryId}`,
      headers: {
        cookie: employee.cookie,
      },
    });
  };

  const reactivateCategory = async (categoryId: string, cookie: string) => {
    return app.inject({
      method: "PUT",
      url: `/api/v1/categories/${categoryId}/reactivate`,
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

    const archivedCategory = await createCategory(
      `Category to reactivate ${randomUUID()}`,
      employee.cookie,
    );

    archivedCategoryId = archivedCategory.id;

    const forbiddenCategory = await createCategory(
      `Category for forbidden test ${randomUUID()}`,
      employee.cookie,
    );

    forbiddenCategoryId = forbiddenCategory.id;

    const activeCategory = await createCategory(
      `Already active category ${randomUUID()}`,
      employee.cookie,
    );

    activeCategoryId = activeCategory.id;

    const archivedResponse = await deactivateCategory(archivedCategoryId);
    expect(archivedResponse.statusCode).toBe(200);

    const forbiddenResponse = await deactivateCategory(forbiddenCategoryId);
    expect(forbiddenResponse.statusCode).toBe(200);
  });

  afterAll(async () => {
    await cleanupTestData({ categoryIds });

    await employee.cleanup();
    await admin.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should reactivate a category created by the authenticated user", async () => {
    const response = await reactivateCategory(
      archivedCategoryId,
      employee.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json()).toMatchObject({
      message: "Category reactivated successfully",
    });

    const category = await db
      .selectFrom("categories")
      .select(["id", "is_active"])
      .where("id", "=", archivedCategoryId)
      .executeTakeFirstOrThrow();

    expect(category.is_active).toBe(true);

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
          (category: { id: string }) => category.id === archivedCategoryId,
        ),
    ).toBe(true);
  });

  it("should return 403 when another user tries to reactivate the category", async () => {
    const response = await reactivateCategory(
      forbiddenCategoryId,
      admin.cookie,
    );

    expect(response.statusCode).toBe(403);
  });

  it("should return 200 when the category is already active", async () => {
    const response = await reactivateCategory(
      activeCategoryId,
      employee.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json()).toMatchObject({
      message: "Category is already active",
    });
  });

  it("should return 404 when the category does not exist", async () => {
    const response = await reactivateCategory(randomUUID(), employee.cookie);

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
      method: "PUT",
      url: `/api/v1/categories/${archivedCategoryId}/reactivate`,
    });

    expect(response.statusCode).toBe(401);
  });
});
