import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ORDER_STATUSES, USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("PUT /api/v1/orders/:id/status", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let otherAdmin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let menuItemId: string;
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
  }: {
    restaurantId: string;
    categoryId: string;
  }) => {
    const menuItem = await db
      .insertInto("menu_items")
      .values({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name: `Test menu item ${randomUUID()}`,
        description: null,
        price: randomPrice().toFixed(2),
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
        items: [{ menuItemId: itemId, quantity: 1 }],
      },
    });

    expect(response.statusCode).toBe(201);

    const order = response.json().order;
    orderIds.push(order.id);

    return order;
  };

  const updateOrderStatus = async (
    id: string,
    status: (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES],
    cookie: string,
  ) => {
    return app.inject({
      method: "PUT",
      url: `/api/v1/orders/${id}/status`,
      headers: { cookie },
      payload: { status },
    });
  };

  const getOrderStatus = async (id: string, cookie: string) => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);

    return response.json().order.status;
  };

  const createPendingOrder = async (cookie = admin.cookie) => {
    return createOrder(cookie, menuItemId);
  };

  const moveOrderToPreparing = async (
    orderId: string,
    cookie = admin.cookie,
  ) => {
    const response = await updateOrderStatus(
      orderId,
      ORDER_STATUSES.PREPARING,
      cookie,
    );

    expect(response.statusCode).toBe(200);
  };

  const moveOrderToReady = async (orderId: string, cookie = admin.cookie) => {
    await moveOrderToPreparing(orderId, cookie);

    const response = await updateOrderStatus(
      orderId,
      ORDER_STATUSES.READY,
      cookie,
    );

    expect(response.statusCode).toBe(200);
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

  it("should move an order from pending to preparing", async () => {
    const order = await createPendingOrder();

    const response = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.PREPARING,
      admin.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json().order).toMatchObject({
      id: order.id,
      status: ORDER_STATUSES.PREPARING,
    });

    expect(await getOrderStatus(order.id, admin.cookie)).toBe(
      ORDER_STATUSES.PREPARING,
    );
  });

  it("should move an order from preparing to ready", async () => {
    const order = await createPendingOrder();

    await moveOrderToPreparing(order.id);

    const response = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.READY,
      admin.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json().order).toMatchObject({
      id: order.id,
      status: ORDER_STATUSES.READY,
    });

    expect(await getOrderStatus(order.id, admin.cookie)).toBe(
      ORDER_STATUSES.READY,
    );
  });

  it("should move an order from ready to completed", async () => {
    const order = await createPendingOrder();

    await moveOrderToReady(order.id);

    const response = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.COMPLETED,
      admin.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json().order).toMatchObject({
      id: order.id,
      status: ORDER_STATUSES.COMPLETED,
    });

    expect(await getOrderStatus(order.id, admin.cookie)).toBe(
      ORDER_STATUSES.COMPLETED,
    );
  });

  it("should allow an employee to update the order status", async () => {
    const order = await createPendingOrder();

    const response = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.PREPARING,
      employee.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json().order).toMatchObject({
      id: order.id,
      status: ORDER_STATUSES.PREPARING,
    });

    expect(await getOrderStatus(order.id, employee.cookie)).toBe(
      ORDER_STATUSES.PREPARING,
    );
  });

  it("should allow cancelling a pending order", async () => {
    const order = await createPendingOrder();

    const response = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.CANCELLED,
      admin.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(await getOrderStatus(order.id, admin.cookie)).toBe(
      ORDER_STATUSES.CANCELLED,
    );
  });

  it("should allow cancelling an order in preparation", async () => {
    const order = await createPendingOrder();

    await moveOrderToPreparing(order.id);

    const response = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.CANCELLED,
      admin.cookie,
    );

    expect(response.statusCode).toBe(200);

    expect(await getOrderStatus(order.id, admin.cookie)).toBe(
      ORDER_STATUSES.CANCELLED,
    );
  });

  it("should return 409 when trying to move a pending order directly to ready", async () => {
    const order = await createPendingOrder();

    const response = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.READY,
      admin.cookie,
    );

    expect(response.statusCode).toBe(409);

    expect(await getOrderStatus(order.id, admin.cookie)).toBe(
      ORDER_STATUSES.PENDING,
    );
  });

  it("should return 409 when trying to cancel an order that is ready", async () => {
    const order = await createPendingOrder();

    await moveOrderToReady(order.id);

    const response = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.CANCELLED,
      admin.cookie,
    );

    expect(response.statusCode).toBe(409);

    expect(await getOrderStatus(order.id, admin.cookie)).toBe(
      ORDER_STATUSES.READY,
    );
  });

  it("should return 409 when trying to update a completed order", async () => {
    const order = await createPendingOrder();

    await moveOrderToReady(order.id);

    const completeResponse = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.COMPLETED,
      admin.cookie,
    );

    expect(completeResponse.statusCode).toBe(200);

    const response = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.CANCELLED,
      admin.cookie,
    );

    expect(response.statusCode).toBe(409);

    expect(await getOrderStatus(order.id, admin.cookie)).toBe(
      ORDER_STATUSES.COMPLETED,
    );
  });

  it("should return 409 when trying to update a cancelled order", async () => {
    const order = await createPendingOrder();

    const cancelResponse = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.CANCELLED,
      admin.cookie,
    );

    expect(cancelResponse.statusCode).toBe(200);

    const response = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.PREPARING,
      admin.cookie,
    );

    expect(response.statusCode).toBe(409);

    expect(await getOrderStatus(order.id, admin.cookie)).toBe(
      ORDER_STATUSES.CANCELLED,
    );
  });

  it("should return 404 when the order belongs to another restaurant", async () => {
    const otherOrder = await createOrder(
      otherAdmin.cookie,
      otherRestaurantMenuItemId,
    );

    const response = await updateOrderStatus(
      otherOrder.id,
      ORDER_STATUSES.PREPARING,
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
    const response = await updateOrderStatus(
      randomUUID(),
      ORDER_STATUSES.PREPARING,
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

  it("should return 400 when the request contains an invalid status", async () => {
    const order = await createPendingOrder();

    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/orders/${order.id}/status`,
      headers: { cookie: admin.cookie },
      payload: { status: "INVALID" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const order = await createPendingOrder();

    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/orders/${order.id}/status`,
      payload: { status: ORDER_STATUSES.PREPARING },
    });

    expect(response.statusCode).toBe(401);
  });
});
