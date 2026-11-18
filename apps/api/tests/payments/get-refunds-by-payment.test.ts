import { randomUUID } from "node:crypto";
import { ORDER_STATUSES, USER_ROLES } from "@mealware/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("GET /api/v1/payments/:id/refunds", () => {
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
    amount: number,
  ) => {
    return app.inject({
      method: "POST",
      url: `/api/v1/payments/${paymentId}/refunds`,
      headers: { cookie },
      payload: { amount },
    });
  };

  const getRefunds = async (paymentId: string, cookie?: string) => {
    return app.inject({
      method: "GET",
      url: `/api/v1/payments/${paymentId}/refunds`,
      ...(cookie ? { headers: { cookie } } : {}),
    });
  };

  const createPaidOrder = async (
    cookie = admin.cookie,
    itemId = menuItemId,
    itemPrice = menuItemPrice,
  ) => {
    const order = await createReadyOrder(cookie, itemId);

    const paymentResponse = await createPayment(order.id, cookie, itemPrice);

    if (paymentResponse.statusCode !== 201) {
      console.error("Payment creation failed:", paymentResponse.json());
    }

    expect(paymentResponse.statusCode).toBe(201);

    return {
      order,
      payment: paymentResponse.json().payment,
      paymentAmount: itemPrice,
    };
  };

  const getHalfRefundAmounts = (totalAmount: number) => {
    const totalCents = Math.round(totalAmount * 100);
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

  it("should return all refunds for a payment", async () => {
    const { payment, paymentAmount } = await createPaidOrder();

    const { firstAmount, secondAmount } = getHalfRefundAmounts(paymentAmount);

    const firstRefundResponse = await createRefund(
      payment.id,
      admin.cookie,
      firstAmount,
    );

    const secondRefundResponse = await createRefund(
      payment.id,
      admin.cookie,
      secondAmount,
    );

    expect(firstRefundResponse.statusCode).toBe(201);
    expect(secondRefundResponse.statusCode).toBe(201);

    const response = await getRefunds(payment.id, admin.cookie);

    expect(response.statusCode).toBe(200);

    const { refunds } = response.json();

    expect(refunds).toHaveLength(2);
    expect(refunds[0]).toMatchObject({
      payment_id: payment.id,
      amount: firstAmount.toFixed(2),
      created_by: admin.user.id,
    });
    expect(refunds[1]).toMatchObject({
      payment_id: payment.id,
      amount: secondAmount.toFixed(2),
      created_by: admin.user.id,
    });
  });

  it("should return an empty array when the payment has no refunds", async () => {
    const { payment } = await createPaidOrder();

    const response = await getRefunds(payment.id, admin.cookie);

    expect(response.statusCode).toBe(200);
    expect(response.json().refunds).toEqual([]);
  });

  it("should return refunds in chronological order", async () => {
    const { payment, paymentAmount } = await createPaidOrder();

    const { firstAmount, secondAmount } = getHalfRefundAmounts(paymentAmount);

    const firstRefundResponse = await createRefund(
      payment.id,
      admin.cookie,
      firstAmount,
    );

    const secondRefundResponse = await createRefund(
      payment.id,
      admin.cookie,
      secondAmount,
    );

    expect(firstRefundResponse.statusCode).toBe(201);
    expect(secondRefundResponse.statusCode).toBe(201);

    const firstRefund = firstRefundResponse.json().refund;
    const secondRefund = secondRefundResponse.json().refund;

    const response = await getRefunds(payment.id, admin.cookie);

    expect(response.statusCode).toBe(200);

    const { refunds } = response.json();

    expect(refunds.map((refund: { id: string }) => refund.id)).toEqual([
      firstRefund.id,
      secondRefund.id,
    ]);
  });

  it("should allow an admin to list refunds", async () => {
    const { payment, paymentAmount } = await createPaidOrder();

    const refundResponse = await createRefund(
      payment.id,
      admin.cookie,
      paymentAmount,
    );

    expect(refundResponse.statusCode).toBe(201);

    const response = await getRefunds(payment.id, admin.cookie);

    expect(response.statusCode).toBe(200);
    expect(response.json().refunds).toHaveLength(1);
  });

  it("should return 403 when an employee tries to list refunds", async () => {
    const { payment, paymentAmount } = await createPaidOrder();

    const refundResponse = await createRefund(
      payment.id,
      admin.cookie,
      paymentAmount,
    );

    expect(refundResponse.statusCode).toBe(201);

    const response = await getRefunds(payment.id, employee.cookie);

    expect(response.statusCode).toBe(403);
  });

  it("should return 404 when the payment belongs to another restaurant", async () => {
    const { payment } = await createPaidOrder(
      otherAdmin.cookie,
      otherRestaurantMenuItemId,
      otherRestaurantMenuItemPrice,
    );

    const response = await getRefunds(payment.id, admin.cookie);

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("PAYMENT_NOT_FOUND");
  });

  it("should return 404 when the payment does not exist", async () => {
    const response = await getRefunds(randomUUID(), admin.cookie);

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("PAYMENT_NOT_FOUND");
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const { payment } = await createPaidOrder();

    const response = await getRefunds(payment.id);

    expect(response.statusCode).toBe(401);
  });
});
