import { sql, type Kysely } from "kysely";

export const up = async (db: Kysely<any>): Promise<void> => {
  /**
   * ENUM payment_method
   * -------------------
   * - CASH: Payment made with cash.
   * - DEBIT_CARD: Payment made with a debit card.
   * - CREDIT_CARD: Payment made with a credit card.
   * - TRANSFER: Payment made through a bank transfer.
   */
  await db.schema
    .createType("payment_method")
    .asEnum(["CASH", "DEBIT_CARD", "CREDIT_CARD", "TRANSFER"])
    .execute();

  /**
   * TABLE payments
   * --------------
   * id            UUID           PK, DEFAULT gen_random_uuid()
   * restaurant_id UUID           NOT NULL
   * order_id      UUID           NOT NULL
   * method        payment_method NOT NULL
   * amount        NUMERIC(10,2)  NOT NULL
   * created_by    UUID           NOT NULL
   * created_at    TIMESTAMPTZ    NOT NULL, DEFAULT now()
   *
   * Constraints:
   * - UNIQUE (restaurant_id, id), required for composite foreign keys.
   * - FOREIGN KEY (restaurant_id, order_id)
   *   REFERENCES orders(restaurant_id, id), ON DELETE RESTRICT.
   * - FOREIGN KEY (restaurant_id, created_by)
   *   REFERENCES users(restaurant_id, id), ON DELETE RESTRICT.
   * - CHECK (amount > 0).
   *
   * Indexes:
   * - payments_restaurant_order_idx: (restaurant_id, order_id).
   */
  await db.schema
    .createTable("payments")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("restaurant_id", "uuid", (col) => col.notNull())
    .addColumn("order_id", "uuid", (col) => col.notNull())
    .addColumn("method", sql`payment_method`, (col) => col.notNull())
    .addColumn("amount", sql`numeric(10, 2)`, (col) => col.notNull())
    .addColumn("created_by", "uuid", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint("payments_restaurant_id_id_unique", [
      "restaurant_id",
      "id",
    ])
    .addForeignKeyConstraint(
      "payments_restaurant_order_fk",
      ["restaurant_id", "order_id"],
      "orders",
      ["restaurant_id", "id"],
      (cb) => cb.onDelete("restrict"),
    )
    .addForeignKeyConstraint(
      "payments_restaurant_created_by_fk",
      ["restaurant_id", "created_by"],
      "users",
      ["restaurant_id", "id"],
      (cb) => cb.onDelete("restrict"),
    )
    .addCheckConstraint("payments_amount_positive_check", sql`amount > 0`)
    .execute();

  await db.schema
    .createIndex("payments_restaurant_order_idx")
    .on("payments")
    .columns(["restaurant_id", "order_id"])
    .execute();

  /**
   * TABLE refunds
   * -------------
   * id            UUID          PK, DEFAULT gen_random_uuid()
   * restaurant_id UUID          NOT NULL
   * payment_id    UUID          NOT NULL
   * amount        NUMERIC(10,2) NOT NULL
   * created_by    UUID          NOT NULL
   * created_at    TIMESTAMPTZ   NOT NULL, DEFAULT now()
   *
   * Constraints:
   * - FOREIGN KEY (restaurant_id, payment_id)
   *   REFERENCES payments(restaurant_id, id), ON DELETE RESTRICT.
   * - FOREIGN KEY (restaurant_id, created_by)
   *   REFERENCES users(restaurant_id, id), ON DELETE RESTRICT.
   * - CHECK (amount > 0).
   *
   * Indexes:
   * - refunds_restaurant_payment_idx: (restaurant_id, payment_id).
   */
  await db.schema
    .createTable("refunds")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("restaurant_id", "uuid", (col) => col.notNull())
    .addColumn("payment_id", "uuid", (col) => col.notNull())
    .addColumn("amount", sql`numeric(10, 2)`, (col) => col.notNull())
    .addColumn("created_by", "uuid", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addForeignKeyConstraint(
      "refunds_restaurant_payment_fk",
      ["restaurant_id", "payment_id"],
      "payments",
      ["restaurant_id", "id"],
      (cb) => cb.onDelete("restrict"),
    )
    .addForeignKeyConstraint(
      "refunds_restaurant_created_by_fk",
      ["restaurant_id", "created_by"],
      "users",
      ["restaurant_id", "id"],
      (cb) => cb.onDelete("restrict"),
    )
    .addCheckConstraint("refunds_amount_positive_check", sql`amount > 0`)
    .execute();

  await db.schema
    .createIndex("refunds_restaurant_payment_idx")
    .on("refunds")
    .columns(["restaurant_id", "payment_id"])
    .execute();
};

export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema.dropTable("refunds").execute();
  await db.schema.dropTable("payments").execute();
  await db.schema.dropType("payment_method").execute();
};
