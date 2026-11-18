import { randomUUID } from "node:crypto";
import { ORDER_STATUSES, USER_ROLES } from "@mealware/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("GET /api/v1/orders/:id/payments", () => {
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

  const createOrder = async (cookie: string, itemId: string, quantity = 1) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie },
      payload: {
        type: "DINE_IN",
        items: [{ menuItemId: itemId, quantity }],
      },
    });

    expect(response.statusCode).toBe(201);

    const order = response.json().order;
    orderIds.push(order.id);

    return order;
  };

  const moveOrderToReady = async (orderId: string, cookie: string) => {
    const preparingResponse = await app.inject({
      method: "PUT",
      url: `/api/v1/orders/${orderId}/status`,
      headers: { cookie },
      payload: { status: ORDER_STATUSES.PREPARING },
    });

    expect(preparingResponse.statusCode).toBe(200);

    const readyResponse = await app.inject({
      method: "PUT",
      url: `/api/v1/orders/${orderId}/status`,
      headers: { cookie },
      payload: { status: ORDER_STATUSES.READY },
    });

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
    method: string,
    amount: number,
  ) => {
    return app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payments`,
      headers: { cookie },
      payload: { method, amount },
    });
  };

  const getPayments = async (orderId: string, cookie?: string) => {
    return app.inject({
      method: "GET",
      url: `/api/v1/orders/${orderId}/payments`,
      ...(cookie ? { headers: { cookie } } : {}),
    });
  };

  const getHalfPaymentAmounts = () => {
    const totalCents = Math.round(menuItemPrice * 100);
    const firstAmountCents = Math.floor(totalCents / 2);
    const secondAmountCents = totalCents - firstAmountCents;

    return {
      firstAmount: firstAmountCents / 100,
      secondAmount: secondAmountCents / 100,
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

  it("should return all payments for an order", async () => {
    const order = await createReadyOrder();
    const { firstAmount, secondAmount } = getHalfPaymentAmounts();

    const firstPaymentResponse = await createPayment(
      order.id,
      employee.cookie,
      "CASH",
      firstAmount,
    );

    const secondPaymentResponse = await createPayment(
      order.id,
      employee.cookie,
      "TRANSFER",
      secondAmount,
    );

    expect(firstPaymentResponse.statusCode).toBe(201);
    expect(secondPaymentResponse.statusCode).toBe(201);

    const response = await getPayments(order.id, employee.cookie);

    expect(response.statusCode).toBe(200);

    const { payments } = response.json();

    expect(payments).toHaveLength(2);
    expect(payments[0]).toMatchObject({
      order_id: order.id,
      method: "CASH",
      amount: firstAmount.toFixed(2),
      created_by: employee.user.id,
    });
    expect(payments[1]).toMatchObject({
      order_id: order.id,
      method: "TRANSFER",
      amount: secondAmount.toFixed(2),
      created_by: employee.user.id,
    });
  });

  it("should return an empty array when the order has no payments", async () => {
    const order = await createReadyOrder();

    const response = await getPayments(order.id, employee.cookie);

    expect(response.statusCode).toBe(200);
    expect(response.json().payments).toEqual([]);
  });

  it("should return payments in chronological order", async () => {
    const order = await createReadyOrder();
    const { firstAmount, secondAmount } = getHalfPaymentAmounts();

    const firstPaymentResponse = await createPayment(
      order.id,
      employee.cookie,
      "CASH",
      firstAmount,
    );

    const secondPaymentResponse = await createPayment(
      order.id,
      employee.cookie,
      "DEBIT_CARD",
      secondAmount,
    );

    expect(firstPaymentResponse.statusCode).toBe(201);
    expect(secondPaymentResponse.statusCode).toBe(201);

    const firstPayment = firstPaymentResponse.json().payment;
    const secondPayment = secondPaymentResponse.json().payment;

    const response = await getPayments(order.id, employee.cookie);

    expect(response.statusCode).toBe(200);

    const { payments } = response.json();

    expect(payments.map((payment: { id: string }) => payment.id)).toEqual([
      firstPayment.id,
      secondPayment.id,
    ]);
  });

  it("should allow an admin to list payments", async () => {
    const order = await createReadyOrder();

    const paymentResponse = await createPayment(
      order.id,
      employee.cookie,
      "CASH",
      menuItemPrice,
    );

    expect(paymentResponse.statusCode).toBe(201);

    const response = await getPayments(order.id, admin.cookie);

    expect(response.statusCode).toBe(200);
    expect(response.json().payments).toHaveLength(1);
  });

  it("should return 404 when the order belongs to another restaurant", async () => {
    const otherOrder = await createReadyOrder(
      otherAdmin.cookie,
      otherRestaurantMenuItemId,
    );

    const response = await getPayments(otherOrder.id, admin.cookie);

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("ORDER_NOT_FOUND");
  });

  it("should return 404 when the order does not exist", async () => {
    const response = await getPayments(randomUUID(), employee.cookie);

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("ORDER_NOT_FOUND");
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const order = await createReadyOrder();

    const response = await getPayments(order.id);

    expect(response.statusCode).toBe(401);
  });
});
