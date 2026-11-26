import type { CreatePaymentInput, CreateRefundInput } from "@mealware/shared";
import { sql } from "kysely";
import { db } from "../database/database.js";
import { getDateRange } from "../utils/date-range.js";
import type { DatePeriod } from "../utils/date-range.js";

const toCents = (amount: string | number): number => {
  return Math.round(Number(amount) * 100);
};

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
      .select(["id", "status"])
      .where("id", "=", paymentReference.order_id)
      .where("restaurant_id", "=", restaurantId)
      .forUpdate()
      .executeTakeFirst();

    if (!order) {
      return { status: "order_not_found" as const };
    }

    if (order.status === "CANCELLED") {
      return { status: "order_cancelled" as const };
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
  const payment = await db
    .selectFrom("payments")
    .select("id")
    .where("id", "=", paymentId)
    .where("restaurant_id", "=", restaurantId)
    .executeTakeFirst();

  if (!payment) {
    return { status: "payment_not_found" as const };
  }

  const refunds = await db
    .selectFrom("refunds")
    .selectAll()
    .where("payment_id", "=", paymentId)
    .where("restaurant_id", "=", restaurantId)
    .orderBy("created_at", "asc")
    .execute();

  return {
    status: "found" as const,
    refunds,
  };
};

interface GetPaymentsPaginatedInput {
  restaurantId: string;
  page: number;
  limit: number;
  period: DatePeriod;
  method?: CreatePaymentInput["method"];
  orderNumber?: number;
}

type MovementQueryFilters = Omit<GetPaymentsPaginatedInput, "page" | "limit">;

const buildMovementsQuery = ({
  restaurantId,
  period,
  method,
  orderNumber,
}: MovementQueryFilters) => {
  const { startDate, endDate } = getDateRange(period);

  let paymentsQuery = db
    .selectFrom("payments")
    .innerJoin("orders", (join) =>
      join
        .onRef("orders.id", "=", "payments.order_id")
        .onRef("orders.restaurant_id", "=", "payments.restaurant_id"),
    )
    .select([
      "payments.id as id",
      sql<"PAYMENT" | "REFUND">`'PAYMENT'`.as("type"),
      "payments.order_id as order_id",
      "orders.order_number as order_number",
      "payments.method as method",
      sql<string>`payments.amount::text`.as("amount"),
      "payments.created_at as created_at",
      sql<string | null>`NULL`.as("payment_id"),
    ])
    .where("payments.restaurant_id", "=", restaurantId);

  let refundsQuery = db
    .selectFrom("refunds")
    .innerJoin("payments", (join) =>
      join
        .onRef("payments.id", "=", "refunds.payment_id")
        .onRef("payments.restaurant_id", "=", "refunds.restaurant_id"),
    )
    .innerJoin("orders", (join) =>
      join
        .onRef("orders.id", "=", "payments.order_id")
        .onRef("orders.restaurant_id", "=", "payments.restaurant_id"),
    )
    .select([
      "refunds.id as id",
      sql<"PAYMENT" | "REFUND">`'REFUND'`.as("type"),
      "payments.order_id as order_id",
      "orders.order_number as order_number",
      "payments.method as method",
      sql<string>`(-refunds.amount)::text`.as("amount"),
      "refunds.created_at as created_at",
      sql<string | null>`refunds.payment_id`.as("payment_id"),
    ])
    .where("refunds.restaurant_id", "=", restaurantId);

  if (startDate) {
    paymentsQuery = paymentsQuery.where("payments.created_at", ">=", startDate);
    refundsQuery = refundsQuery.where("refunds.created_at", ">=", startDate);
  }

  if (endDate) {
    paymentsQuery = paymentsQuery.where("payments.created_at", "<", endDate);
    refundsQuery = refundsQuery.where("refunds.created_at", "<", endDate);
  }

  if (method) {
    paymentsQuery = paymentsQuery.where("payments.method", "=", method);
    refundsQuery = refundsQuery.where("payments.method", "=", method);
  }

  if (orderNumber !== undefined) {
    paymentsQuery = paymentsQuery.where(
      "orders.order_number",
      "=",
      orderNumber,
    );
    refundsQuery = refundsQuery.where("orders.order_number", "=", orderNumber);
  }

  return paymentsQuery.unionAll(refundsQuery);
};

const getMovementsSummary = async (filters: MovementQueryFilters) => {
  return db
    .with("movements", () => buildMovementsQuery(filters))
    .selectFrom("movements")
    .select([
      sql<string>`
        COALESCE(
          SUM(CASE WHEN type = 'PAYMENT' THEN amount::numeric ELSE 0 END),
          0
        )::text
      `.as("total_received"),
      sql<string>`
        COALESCE(
          SUM(CASE WHEN type = 'REFUND' THEN ABS(amount::numeric) ELSE 0 END),
          0
        )::text
      `.as("total_refunded"),
      sql<string>`
        COALESCE(SUM(amount::numeric), 0)::text
      `.as("net_total"),
    ])
    .executeTakeFirstOrThrow();
};

const getMovementsCount = async (filters: MovementQueryFilters) => {
  const result = await db
    .with("movements", () => buildMovementsQuery(filters))
    .selectFrom("movements")
    .select((eb) => eb.fn.countAll<number>().as("total"))
    .executeTakeFirstOrThrow();

  return Number(result.total);
};

const getMovementsPaginated = async ({
  filters,
  limit,
  offset,
}: {
  filters: MovementQueryFilters;
  limit: number;
  offset: number;
}) => {
  return db
    .with("movements", () => buildMovementsQuery(filters))
    .selectFrom("movements")
    .selectAll()
    .orderBy("created_at", "desc")
    .orderBy("id", "desc")
    .limit(limit)
    .offset(offset)
    .execute();
};

export const getPaymentsPaginated = async ({
  page,
  limit,
  ...filters
}: GetPaymentsPaginatedInput) => {
  const offset = (page - 1) * limit;

  const [movements, summary, total] = await Promise.all([
    getMovementsPaginated({
      filters,
      limit,
      offset,
    }),
    getMovementsSummary(filters),
    getMovementsCount(filters),
  ]);

  return {
    movements,
    summary: {
      totalReceived: summary.total_received,
      totalRefunded: summary.total_refunded,
      netTotal: summary.net_total,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
