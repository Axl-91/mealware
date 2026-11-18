import type { CreatePaymentInput, CreateRefundInput } from "@mealware/shared";
import { sql } from "kysely";
import { db } from "../database/database.js";

interface CreatePaymentRepositoryInput extends CreatePaymentInput {
  orderId: string;
  restaurantId: string;
  createdBy: string;
}

export const createPayment = async ({
  orderId,
  restaurantId,
  createdBy,
  method,
  amount,
}: CreatePaymentRepositoryInput) => {
  return db.transaction().execute(async (trx) => {
    const order = await trx
      .selectFrom("orders")
      .select(["id", "status"])
      .where("id", "=", orderId)
      .where("restaurant_id", "=", restaurantId)
      .forUpdate()
      .executeTakeFirst();

    if (!order) {
      return { status: "order_not_found" as const };
    }

    if (!["READY", "COMPLETED"].includes(order.status)) {
      return { status: "order_not_payable" as const };
    }

    const { total: orderTotal } = await trx
      .selectFrom("order_items")
      .select(
        sql<string>`COALESCE(SUM(unit_price * quantity), 0)::text`.as("total"),
      )
      .where("order_id", "=", orderId)
      .where("restaurant_id", "=", restaurantId)
      .executeTakeFirstOrThrow();

    const { total: paymentsTotal } = await trx
      .selectFrom("payments")
      .select(sql<string>`COALESCE(SUM(amount), 0)::text`.as("total"))
      .where("order_id", "=", orderId)
      .where("restaurant_id", "=", restaurantId)
      .executeTakeFirstOrThrow();

    const { total: refundsTotal } = await trx
      .selectFrom("refunds")
      .innerJoin("payments", "payments.id", "refunds.payment_id")
      .select(sql<string>`COALESCE(SUM(refunds.amount), 0)::text`.as("total"))
      .where("payments.order_id", "=", orderId)
      .where("payments.restaurant_id", "=", restaurantId)
      .executeTakeFirstOrThrow();

    const outstandingCents =
      toCents(orderTotal) - toCents(paymentsTotal) + toCents(refundsTotal);

    const amountCents = Math.round(amount * 100);

    if (amountCents > outstandingCents) {
      return { status: "amount_exceeds_balance" as const };
    }

    const payment = await trx
      .insertInto("payments")
      .values({
        restaurant_id: restaurantId,
        order_id: orderId,
        method,
        amount: amount.toFixed(2),
        created_by: createdBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      status: "created" as const,
      payment,
    };
  });
};

interface GetPaymentsByOrderInput {
  orderId: string;
  restaurantId: string;
}

export const getPaymentsByOrder = async ({
  orderId,
  restaurantId,
}: GetPaymentsByOrderInput) => {
  const order = await db
    .selectFrom("orders")
    .select("id")
    .where("id", "=", orderId)
    .where("restaurant_id", "=", restaurantId)
    .executeTakeFirst();

  if (!order) {
    return { status: "order_not_found" as const };
  }

  const payments = await db
    .selectFrom("payments")
    .selectAll()
    .where("order_id", "=", orderId)
    .where("restaurant_id", "=", restaurantId)
    .orderBy("created_at", "asc")
    .execute();

  return {
    status: "found" as const,
    payments,
  };
};

interface CreateRefundRepositoryInput extends CreateRefundInput {
  paymentId: string;
  restaurantId: string;
  createdBy: string;
}

export const createRefund = async ({
  paymentId,
  restaurantId,
  createdBy,
  amount,
}: CreateRefundRepositoryInput) => {
  return db.transaction().execute(async (trx) => {
    // Get the order ID first. The payment is locked after the order.
    const paymentReference = await trx
      .selectFrom("payments")
      .select(["id", "order_id"])
      .where("id", "=", paymentId)
      .where("restaurant_id", "=", restaurantId)
      .executeTakeFirst();

    if (!paymentReference) {
      return { status: "payment_not_found" as const };
    }

    const order = await trx
      .selectFrom("orders")
      .select("id")
      .where("id", "=", paymentReference.order_id)
      .where("restaurant_id", "=", restaurantId)
      .forUpdate()
      .executeTakeFirst();

    if (!order) {
      return { status: "order_not_found" as const };
    }

    const payment = await trx
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", paymentId)
      .where("restaurant_id", "=", restaurantId)
      .forUpdate()
      .executeTakeFirst();

    if (!payment) {
      return { status: "payment_not_found" as const };
    }

    const { total: refundsTotal } = await trx
      .selectFrom("refunds")
      .select(sql<string>`COALESCE(SUM(amount), 0)::text`.as("total"))
      .where("payment_id", "=", paymentId)
      .where("restaurant_id", "=", restaurantId)
      .executeTakeFirstOrThrow();

    const refundableCents = toCents(payment.amount) - toCents(refundsTotal);

    const amountCents = Math.round(amount * 100);

    if (amountCents > refundableCents) {
      return { status: "amount_exceeds_refundable" as const };
    }

    const refund = await trx
      .insertInto("refunds")
      .values({
        restaurant_id: restaurantId,
        payment_id: paymentId,
        amount: amount.toFixed(2),
        created_by: createdBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      status: "created" as const,
      refund,
    };
  });
};

interface GetRefundsByPaymentInput {
  paymentId: string;
  restaurantId: string;
}

export const getRefundsByPayment = async ({
  paymentId,
  restaurantId,
}: GetRefundsByPaymentInput) => {
  return db
    .selectFrom("refunds")
    .selectAll()
    .where("payment_id", "=", paymentId)
    .where("restaurant_id", "=", restaurantId)
    .orderBy("created_at", "asc")
    .execute();
};

const toCents = (amount: string): number => {
  const [integerPart, decimalPart = ""] = amount.split(".");
  return (
    Number(integerPart) * 100 + Number(decimalPart.padEnd(2, "0").slice(0, 2))
  );
};
