import { randomUUID } from "node:crypto";
import { ORDER_STATUSES, USER_ROLES } from "@mealware/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("POST /api/v1/orders/:id/payments", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let otherAdmin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let menuItemId: string;
  let otherRestaurantMenuItemId: string;
  let menuItemPrice: number;

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
        items: [{ menuItemId: itemId, quantity: 2 }],
      },
    });

    expect(response.statusCode).toBe(201);

    const order = response.json().order;
    orderIds.push(order.id);

    return order;
  };

  const updateOrderStatus = async (
    orderId: string,
    status: (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES],
    cookie: string,
  ) => {
    return app.inject({
      method: "PUT",
      url: `/api/v1/orders/${orderId}/status`,
      headers: { cookie },
      payload: { status },
    });
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

  const createReadyOrder = async (
    cookie = admin.cookie,
    itemId = menuItemId,
  ) => {
    const order = await createOrder(cookie, itemId);

    await moveOrderToReady(order.id, cookie);

    return order;
  };

  const createPayment = async (
    orderId: string,
    cookie: string,
    payload: Record<string, unknown>,
  ) => {
    return app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payments`,
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
      `Payments category ${randomUUID()}`,
      admin.cookie,
    );

    const menuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId: category.id,
    });

    menuItemId = menuItem.id;
    menuItemPrice = Number(menuItem.price);

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

  it("should create a payment as an employee", async () => {
    const order = await createReadyOrder();

    const response = await createPayment(order.id, employee.cookie, {
      method: "CASH",
      amount: menuItemPrice,
    });

    expect(response.statusCode).toBe(201);

    const { payment } = response.json();

    expect(payment).toMatchObject({
      restaurant_id: employee.user.restaurant_id,
      order_id: order.id,
      method: "CASH",
      amount: menuItemPrice.toFixed(2),
      created_by: employee.user.id,
    });

    expect(payment.id).toBeDefined();
    expect(payment.created_at).toBeDefined();
  });

  it("should create a payment as an admin", async () => {
    const order = await createReadyOrder();

    const response = await createPayment(order.id, admin.cookie, {
      method: "DEBIT_CARD",
      amount: menuItemPrice,
    });

    expect(response.statusCode).toBe(201);

    expect(response.json().payment).toMatchObject({
      order_id: order.id,
      method: "DEBIT_CARD",
      amount: menuItemPrice.toFixed(2),
      created_by: admin.user.id,
    });
  });

  it("should allow multiple partial payments with different methods", async () => {
    const order = await createReadyOrder();

    const firstResponse = await createPayment(order.id, employee.cookie, {
      method: "CASH",
      amount: menuItemPrice,
    });

    const secondResponse = await createPayment(order.id, employee.cookie, {
      method: "TRANSFER",
      amount: menuItemPrice,
    });

    expect(firstResponse.statusCode).toBe(201);
    expect(secondResponse.statusCode).toBe(201);

    expect(firstResponse.json().payment.amount).toBe(menuItemPrice.toFixed(2));

    expect(secondResponse.json().payment.amount).toBe(menuItemPrice.toFixed(2));
  });

  it("should allow payments for completed orders", async () => {
    const order = await createReadyOrder();

    const completeResponse = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.COMPLETED,
      admin.cookie,
    );

    expect(completeResponse.statusCode).toBe(200);

    const response = await createPayment(order.id, employee.cookie, {
      method: "CREDIT_CARD",
      amount: menuItemPrice,
    });

    expect(response.statusCode).toBe(201);
  });

  it("should return 409 when the order is pending", async () => {
    const order = await createOrder(admin.cookie, menuItemId);

    const response = await createPayment(order.id, employee.cookie, {
      method: "CASH",
      amount: menuItemPrice,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("ORDER_NOT_PAYABLE");
  });

  it("should return 409 when the order is preparing", async () => {
    const order = await createOrder(admin.cookie, menuItemId);

    await moveOrderToPreparing(order.id);

    const response = await createPayment(order.id, employee.cookie, {
      method: "CASH",
      amount: menuItemPrice,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("ORDER_NOT_PAYABLE");
  });

  it("should return 409 when the payment exceeds the outstanding balance", async () => {
    const order = await createReadyOrder();

    const response = await createPayment(order.id, employee.cookie, {
      method: "CASH",
      amount: menuItemPrice * 2 + 0.01,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("PAYMENT_AMOUNT_EXCEEDS_BALANCE");
  });

  it("should return 404 when the order belongs to another restaurant", async () => {
    const otherOrder = await createOrder(
      otherAdmin.cookie,
      otherRestaurantMenuItemId,
    );

    await moveOrderToReady(otherOrder.id, otherAdmin.cookie);

    const response = await createPayment(otherOrder.id, admin.cookie, {
      method: "CASH",
      amount: menuItemPrice,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("ORDER_NOT_FOUND");
  });

  it("should return 404 when the order does not exist", async () => {
    const response = await createPayment(randomUUID(), employee.cookie, {
      method: "CASH",
      amount: menuItemPrice,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("ORDER_NOT_FOUND");
  });

  it("should return 400 when the payment method is invalid", async () => {
    const order = await createReadyOrder();

    const response = await createPayment(order.id, employee.cookie, {
      method: "INVALID",
      amount: menuItemPrice,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the amount is not positive", async () => {
    const order = await createReadyOrder();

    const response = await createPayment(order.id, employee.cookie, {
      method: "CASH",
      amount: 0,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the amount has more than two decimal places", async () => {
    const order = await createReadyOrder();

    const response = await createPayment(order.id, employee.cookie, {
      method: "CASH",
      amount: 1.001,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const order = await createReadyOrder();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${order.id}/payments`,
      payload: {
        method: "CASH",
        amount: menuItemPrice,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
