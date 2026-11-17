import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  /**
   * ENUM order_type
   * ---------------
   * - DINE_IN: Order consumed at the restaurant.
   * - TAKEAWAY: Order prepared for takeaway.
   */
  await db.schema
    .createType("order_type")
    .asEnum(["DINE_IN", "TAKEAWAY"])
    .execute();

  /**
   * ENUM order_status
   * -----------------
   * - PENDING: Order created and waiting to be prepared.
   * - PREPARING: Order is being prepared.
   * - READY: Order is ready for pickup.
   * - COMPLETED: Order has been completed.
   * - CANCELLED: Order has been cancelled.
   */
  await db.schema
    .createType("order_status")
    .asEnum(["PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"])
    .execute();

  /**
   * UNIQUE CONSTRAINT users_restaurant_id_id_unique
   * ------------------------------------------------
   * - Columns: (restaurant_id, id)
   * - Required to enforce composite foreign keys referencing users
   *   within the same restaurant.
   */
  await db.schema
    .alterTable("users")
    .addUniqueConstraint("users_restaurant_id_id_unique", [
      "restaurant_id",
      "id",
    ])
    .execute();

  /**
   * UNIQUE CONSTRAINT menu_items_restaurant_id_id_unique
   * ----------------------------------------------------
   * - Columns: (restaurant_id, id)
   * - Required to enforce composite foreign keys referencing menu items
   *   within the same restaurant.
   */
  await db.schema
    .alterTable("menu_items")
    .addUniqueConstraint("menu_items_restaurant_id_id_unique", [
      "restaurant_id",
      "id",
    ])
    .execute();

  /**
   * TABLE orders
   * ------------
   * id            UUID         PK, DEFAULT gen_random_uuid()
   * restaurant_id UUID         NOT NULL, FK restaurants(id), ON DELETE RESTRICT
   * order_number  INTEGER      NOT NULL
   * order_date    DATE         NOT NULL, DEFAULT Argentina local date
   * type          order_type   NOT NULL
   * status        order_status NOT NULL, DEFAULT 'PENDING'
   * customer_name VARCHAR(150) NULL
   * notes         TEXT         NULL
   * created_by    UUID         NOT NULL, FK users(restaurant_id, id)
   * created_at    TIMESTAMPTZ  NOT NULL, DEFAULT now()
   * updated_at    TIMESTAMPTZ  NOT NULL, DEFAULT now()
   *
   * Constraints:
   * - UNIQUE (restaurant_id, id), required for composite foreign keys.
   * - UNIQUE (restaurant_id, order_date, order_number).
   * - CHECK (order_number > 0).
   * - CHECK (customer_name IS NULL OR length(btrim(customer_name)) > 0).
   * - FOREIGN KEY (restaurant_id, created_by)
   *   REFERENCES users(restaurant_id, id), ON DELETE RESTRICT.
   *
   * Indexes:
   * - orders_restaurant_status_created_at_idx:
   *   (restaurant_id, status, created_at).
   */
  await db.schema
    .createTable("orders")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("restaurant_id", "uuid", (column) =>
      column.notNull().references("restaurants.id").onDelete("restrict"),
    )
    .addColumn("order_number", "integer", (column) => column.notNull())
    .addColumn("order_date", "date", (column) =>
      column
        .notNull()
        .defaultTo(
          sql`(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`,
        ),
    )
    .addColumn("type", sql`order_type`, (column) => column.notNull())
    .addColumn("status", sql`order_status`, (column) =>
      column.notNull().defaultTo("PENDING"),
    )
    .addColumn("customer_name", "varchar(150)")
    .addColumn("notes", "text")
    .addColumn("created_by", "uuid", (column) => column.notNull())
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint("orders_restaurant_id_id_unique", [
      "restaurant_id",
      "id",
    ])
    .addUniqueConstraint("orders_restaurant_date_number_unique", [
      "restaurant_id",
      "order_date",
      "order_number",
    ])
    .addCheckConstraint("orders_order_number_check", sql`order_number > 0`)
    .addCheckConstraint(
      "orders_customer_name_check",
      sql`customer_name IS NULL OR length(btrim(customer_name)) > 0`,
    )
    .execute();

  await sql`
    ALTER TABLE orders
    ADD CONSTRAINT orders_restaurant_created_by_fkey
    FOREIGN KEY (restaurant_id, created_by)
    REFERENCES users (restaurant_id, id)
    ON DELETE RESTRICT
  `.execute(db);

  await db.schema
    .createIndex("orders_restaurant_status_created_at_idx")
    .on("orders")
    .columns(["restaurant_id", "status", "created_at"])
    .execute();

  /**
   * TABLE order_items
   * -----------------
   * id            UUID         PK, DEFAULT gen_random_uuid()
   * restaurant_id UUID         NOT NULL
   * order_id      UUID         NOT NULL
   * menu_item_id  UUID         NOT NULL
   * name          VARCHAR(150) NOT NULL, menu item name snapshot
   * unit_price    NUMERIC(10,2) NOT NULL, menu item price snapshot
   * quantity      INTEGER      NOT NULL
   * notes         TEXT         NULL
   * created_at    TIMESTAMPTZ  NOT NULL, DEFAULT now()
   *
   * Constraints:
   * - FOREIGN KEY (restaurant_id, order_id)
   *   REFERENCES orders(restaurant_id, id), ON DELETE CASCADE.
   * - FOREIGN KEY (restaurant_id, menu_item_id)
   *   REFERENCES menu_items(restaurant_id, id), ON DELETE RESTRICT.
   * - CHECK (length(btrim(name)) > 0).
   * - CHECK (unit_price >= 0).
   * - CHECK (quantity > 0).
   *
   * Indexes:
   * - order_items_restaurant_order_id_idx:
   *   (restaurant_id, order_id).
   * - order_items_restaurant_menu_item_id_idx:
   *   (restaurant_id, menu_item_id).
   */
  await db.schema
    .createTable("order_items")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("restaurant_id", "uuid", (column) => column.notNull())
    .addColumn("order_id", "uuid", (column) => column.notNull())
    .addColumn("menu_item_id", "uuid", (column) => column.notNull())
    .addColumn("name", "varchar(150)", (column) => column.notNull())
    .addColumn("unit_price", sql`numeric(10,2)`, (column) => column.notNull())
    .addColumn("quantity", "integer", (column) => column.notNull())
    .addColumn("notes", "text")
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint("order_items_name_check", sql`length(btrim(name)) > 0`)
    .addCheckConstraint("order_items_unit_price_check", sql`unit_price >= 0`)
    .addCheckConstraint("order_items_quantity_check", sql`quantity > 0`)
    .execute();

  await sql`
    ALTER TABLE order_items
    ADD CONSTRAINT order_items_restaurant_order_fkey
    FOREIGN KEY (restaurant_id, order_id)
    REFERENCES orders (restaurant_id, id)
    ON DELETE CASCADE
  `.execute(db);

  await sql`
    ALTER TABLE order_items
    ADD CONSTRAINT order_items_restaurant_menu_item_fkey
    FOREIGN KEY (restaurant_id, menu_item_id)
    REFERENCES menu_items (restaurant_id, id)
    ON DELETE RESTRICT
  `.execute(db);

  await db.schema
    .createIndex("order_items_restaurant_order_id_idx")
    .on("order_items")
    .columns(["restaurant_id", "order_id"])
    .execute();

  await db.schema
    .createIndex("order_items_restaurant_menu_item_id_idx")
    .on("order_items")
    .columns(["restaurant_id", "menu_item_id"])
    .execute();

  /**
   * TABLE order_sequences
   * ---------------------
   * restaurant_id UUID    NOT NULL, FK restaurants(id), ON DELETE CASCADE
   * date          DATE    NOT NULL, Argentina local calendar date
   * last_number   INTEGER NOT NULL, DEFAULT 0
   *
   * Constraints:
   * - PRIMARY KEY (restaurant_id, date).
   * - CHECK (last_number >= 0).
   */
  await db.schema
    .createTable("order_sequences")
    .addColumn("restaurant_id", "uuid", (column) =>
      column.notNull().references("restaurants.id").onDelete("cascade"),
    )
    .addColumn("date", "date", (column) => column.notNull())
    .addColumn("last_number", "integer", (column) =>
      column.notNull().defaultTo(0),
    )
    .addPrimaryKeyConstraint("order_sequences_pkey", ["restaurant_id", "date"])
    .addCheckConstraint(
      "order_sequences_last_number_check",
      sql`last_number >= 0`,
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("order_sequences").execute();
  await db.schema.dropTable("order_items").execute();
  await db.schema.dropTable("orders").execute();

  await db.schema
    .alterTable("menu_items")
    .dropConstraint("menu_items_restaurant_id_id_unique")
    .execute();

  await db.schema
    .alterTable("users")
    .dropConstraint("users_restaurant_id_id_unique")
    .execute();

  await db.schema.dropType("order_status").execute();
  await db.schema.dropType("order_type").execute();
}
