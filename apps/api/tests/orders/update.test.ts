import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("PUT /api/v1/orders/:id", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let otherAdmin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let menuItemId: string;
  let anotherMenuItemId: string;
  let unavailableMenuItemId: string;
  let inactiveMenuItemId: string;
  let otherRestaurantMenuItemId: string;

  const orderIds: string[] = [];
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

  const createOrder = async (cookie: string, itemId: string) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie },
      payload: {
        type: "DINE_IN",
        customerName: "Original customer",
        notes: "Original order notes",
        items: [{ menuItemId: itemId, quantity: 1 }],
      },
    });

    expect(response.statusCode).toBe(201);

    const order = response.json().order;
    orderIds.push(order.id);

    return order;
  };

  const updateOrder = async (
    id: string,
    payload: {
      type: "DINE_IN" | "TAKEAWAY";
      customerName: string | null;
      notes: string | null;
      items: {
        menuItemId: string;
        quantity: number;
        notes?: string | null;
      }[];
    },
    cookie: string,
  ) => {
    return app.inject({
      method: "PUT",
      url: `/api/v1/orders/${id}`,
      headers: { cookie },
      payload,
    });
  };

  const createPendingOrder = async (cookie = admin.cookie) => {
    return createOrder(cookie, menuItemId);
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
      `Orders category ${randomUUID()}`,
      admin.cookie,
    );

    const menuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId: category.id,
    });
    menuItemId = menuItem.id;

    const anotherMenuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId: category.id,
    });
    anotherMenuItemId = anotherMenuItem.id;

    const unavailableMenuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId: category.id,
      isAvailable: false,
    });
    unavailableMenuItemId = unavailableMenuItem.id;

    const inactiveMenuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId: category.id,
      isActive: false,
    });
    inactiveMenuItemId = inactiveMenuItem.id;

    const otherRestaurantMenuItem = await createMenuItem({
      restaurantId: otherAdmin.user.restaurant_id,
      categoryId: category.id,
    });
    otherRestaurantMenuItemId = otherRestaurantMenuItem.id;
  });

  afterAll(async () => {
    await cleanupTestData({
      orderIds,
      menuItemIds,
      categoryIds,
    });

    await employee.cleanup();
    await admin.cleanup();
    await otherAdmin.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should update an order successfully", async () => {
    const order = await createPendingOrder();

    const updatedData = {
      type: "TAKEAWAY" as const,
      customerName: "Updated customer",
      notes: "Updated order notes",
      items: [
        {
          menuItemId: anotherMenuItemId,
          quantity: 3,
          notes: "No onions",
        },
      ],
    };

    const response = await updateOrder(order.id, updatedData, admin.cookie);

    expect(response.statusCode).toBe(200);

    expect(response.json()).toMatchObject({
      message: "Order updated successfully",
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${order.id}`,
      headers: { cookie: admin.cookie },
    });

    expect(getResponse.statusCode).toBe(200);

    expect(getResponse.json().order).toMatchObject({
      id: order.id,
      restaurant_id: admin.user.restaurant_id,
      type: updatedData.type,
      customer_name: updatedData.customerName,
      notes: updatedData.notes,
      status: "PENDING",
      items: [
        {
          menu_item_id: anotherMenuItemId,
          quantity: 3,
          notes: "No onions",
          name: expect.any(String),
          unit_price: expect.any(String),
        },
      ],
    });
  });

  it("should allow an employee to update an order", async () => {
    const order = await createPendingOrder();

    const updatedData = {
      type: "DINE_IN" as const,
      customerName: "Employee updated customer",
      notes: null,
      items: [
        {
          menuItemId: anotherMenuItemId,
          quantity: 2,
        },
      ],
    };

    const response = await updateOrder(order.id, updatedData, employee.cookie);

    expect(response.statusCode).toBe(200);

    expect(response.json()).toMatchObject({
      message: "Order updated successfully",
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${order.id}`,
      headers: { cookie: employee.cookie },
    });

    expect(getResponse.statusCode).toBe(200);

    expect(getResponse.json().order).toMatchObject({
      id: order.id,
      customer_name: updatedData.customerName,
      notes: null,
      items: [
        {
          menu_item_id: anotherMenuItemId,
          quantity: 2,
        },
      ],
    });
  });

  it("should return 404 when the order belongs to another restaurant", async () => {
    const otherOrder = await createOrder(
      otherAdmin.cookie,
      otherRestaurantMenuItemId,
    );

    const response = await updateOrder(
      otherOrder.id,
      {
        type: "TAKEAWAY",
        customerName: null,
        notes: null,
        items: [{ menuItemId, quantity: 1 }],
      },
      admin.cookie,
    );

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      },
    });
  });

  it("should return 404 when the order does not exist", async () => {
    const response = await updateOrder(
      randomUUID(),
      {
        type: "TAKEAWAY",
        customerName: null,
        notes: null,
        items: [{ menuItemId, quantity: 1 }],
      },
      admin.cookie,
    );

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      },
    });
  });

  it("should return 404 when a menu item does not exist", async () => {
    const order = await createPendingOrder();

    const response = await updateOrder(
      order.id,
      {
        type: "TAKEAWAY",
        customerName: null,
        notes: null,
        items: [{ menuItemId: randomUUID(), quantity: 1 }],
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

  it("should return 404 when a menu item belongs to another restaurant", async () => {
    const order = await createPendingOrder();

    const response = await updateOrder(
      order.id,
      {
        type: "TAKEAWAY",
        customerName: null,
        notes: null,
        items: [{ menuItemId: otherRestaurantMenuItemId, quantity: 1 }],
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

  it("should return 404 when a menu item is inactive", async () => {
    const order = await createPendingOrder();

    const response = await updateOrder(
      order.id,
      {
        type: "TAKEAWAY",
        customerName: null,
        notes: null,
        items: [{ menuItemId: inactiveMenuItemId, quantity: 1 }],
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

  it("should return 409 when a menu item is unavailable", async () => {
    const order = await createPendingOrder();

    const response = await updateOrder(
      order.id,
      {
        type: "TAKEAWAY",
        customerName: null,
        notes: null,
        items: [{ menuItemId: unavailableMenuItemId, quantity: 1 }],
      },
      admin.cookie,
    );

    expect(response.statusCode).toBe(409);

    expect(response.json()).toMatchObject({
      error: {
        code: "MENU_ITEM_NOT_AVAILABLE",
      },
    });
  });

  it.each([
    ["an empty items array", []],
    ["an invalid menu item ID", [{ menuItemId: "invalid-id", quantity: 1 }]],
    ["a zero quantity", [{ menuItemId, quantity: 0 }]],
    ["a decimal quantity", [{ menuItemId, quantity: 1.5 }]],
  ])("should return 400 when the request contains %s", async (_, items) => {
    const order = await createPendingOrder();

    const response = await updateOrder(
      order.id,
      {
        type: "TAKEAWAY",
        customerName: null,
        notes: null,
        items,
      },
      admin.cookie,
    );

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 when the request contains an invalid order type", async () => {
    const order = await createPendingOrder();

    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/orders/${order.id}`,
      headers: { cookie: admin.cookie },
      payload: {
        type: "INVALID",
        customerName: null,
        notes: null,
        items: [{ menuItemId, quantity: 1 }],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const order = await createPendingOrder();

    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/orders/${order.id}`,
      payload: {
        type: "TAKEAWAY",
        customerName: null,
        notes: null,
        items: [{ menuItemId, quantity: 1 }],
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
