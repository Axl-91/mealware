import { randomUUID } from "node:crypto";
import { ORDER_STATUSES, USER_ROLES } from "@mealware/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("POST /api/v1/payments/:id/refunds", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let otherAdmin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let menuItemId: string;
  let otherRestaurantMenuItemId: string;
  let menuItemPrice: number;
  let otherRestaurantMenuItemPrice: number;

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

  const moveOrderToReady = async (orderId: string, cookie = admin.cookie) => {
    const preparingResponse = await updateOrderStatus(
      orderId,
      ORDER_STATUSES.PREPARING,
      cookie,
    );

    expect(preparingResponse.statusCode).toBe(200);

    const readyResponse = await updateOrderStatus(
      orderId,
      ORDER_STATUSES.READY,
      cookie,
    );

    expect(readyResponse.statusCode).toBe(200);
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
    amount: number,
  ) => {
    return app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payments`,
      headers: { cookie },
      payload: {
        method: "CASH",
        amount,
      },
    });
  };

  const createRefund = async (
    paymentId: string,
    cookie: string,
    payload: Record<string, unknown>,
  ) => {
    return app.inject({
      method: "POST",
      url: `/api/v1/payments/${paymentId}/refunds`,
      headers: { cookie },
      payload,
    });
  };

  const createPaidOrder = async (
    cookie = admin.cookie,
    itemId = menuItemId,
    itemPrice = menuItemPrice,
  ) => {
    const order = await createReadyOrder(cookie, itemId);
    const paymentAmount = itemPrice * 2;

    const paymentResponse = await createPayment(
      order.id,
      cookie,
      paymentAmount,
    );

    expect(paymentResponse.statusCode).toBe(201);

    return {
      order,
      payment: paymentResponse.json().payment,
      paymentAmount,
    };
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
    otherRestaurantMenuItemPrice = Number(otherRestaurantMenuItem.price);
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

  it("should create a refund as an admin", async () => {
    const { payment, paymentAmount } = await createPaidOrder();

    const response = await createRefund(payment.id, admin.cookie, {
      amount: paymentAmount,
    });

    expect(response.statusCode).toBe(201);

    const { refund } = response.json();

    expect(refund).toMatchObject({
      restaurant_id: admin.user.restaurant_id,
      payment_id: payment.id,
      amount: paymentAmount.toFixed(2),
      created_by: admin.user.id,
    });

    expect(refund.id).toBeDefined();
    expect(refund.created_at).toBeDefined();
  });

  it("should allow multiple partial refunds", async () => {
    const { payment, paymentAmount } = await createPaidOrder();

    const totalCents = Math.round(paymentAmount * 100);
    const firstAmountCents = Math.floor(totalCents / 2);
    const secondAmountCents = totalCents - firstAmountCents;

    const firstAmount = firstAmountCents / 100;
    const secondAmount = secondAmountCents / 100;

    const firstResponse = await createRefund(payment.id, admin.cookie, {
      amount: firstAmount,
    });

    const secondResponse = await createRefund(payment.id, admin.cookie, {
      amount: secondAmount,
    });

    expect(firstResponse.statusCode).toBe(201);
    expect(secondResponse.statusCode).toBe(201);

    expect(firstResponse.json().refund.amount).toBe(firstAmount.toFixed(2));
    expect(secondResponse.json().refund.amount).toBe(secondAmount.toFixed(2));
  });

  it("should return 403 when an employee tries to create a refund", async () => {
    const { payment, paymentAmount } = await createPaidOrder();

    const response = await createRefund(payment.id, employee.cookie, {
      amount: paymentAmount,
    });

    expect(response.statusCode).toBe(403);
  });

  it("should return 409 when the refund exceeds the remaining refundable amount", async () => {
    const { payment, paymentAmount } = await createPaidOrder();

    const firstResponse = await createRefund(payment.id, admin.cookie, {
      amount: paymentAmount,
    });

    expect(firstResponse.statusCode).toBe(201);

    const secondResponse = await createRefund(payment.id, admin.cookie, {
      amount: 0.01,
    });

    expect(secondResponse.statusCode).toBe(409);
    expect(secondResponse.json().error.code).toBe(
      "REFUND_AMOUNT_EXCEEDS_REFUNDABLE",
    );
  });

  it("should return 404 when the payment belongs to another restaurant", async () => {
    const { payment } = await createPaidOrder(
      otherAdmin.cookie,
      otherRestaurantMenuItemId,
      otherRestaurantMenuItemPrice,
    );

    const response = await createRefund(payment.id, admin.cookie, {
      amount: 1,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("PAYMENT_NOT_FOUND");
  });

  it("should return 404 when the payment does not exist", async () => {
    const response = await createRefund(randomUUID(), admin.cookie, {
      amount: 1,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("PAYMENT_NOT_FOUND");
  });

  it("should return 400 when the amount is not positive", async () => {
    const { payment } = await createPaidOrder();

    const response = await createRefund(payment.id, admin.cookie, {
      amount: 0,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the amount has more than two decimal places", async () => {
    const { payment } = await createPaidOrder();

    const response = await createRefund(payment.id, admin.cookie, {
      amount: 1.001,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const { payment } = await createPaidOrder();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/payments/${payment.id}/refunds`,
      payload: {
        amount: 1,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
