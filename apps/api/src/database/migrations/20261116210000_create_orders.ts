import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // ENUMs
  await db.schema
    .createType("order_type")
    .asEnum(["DINE_IN", "TAKEAWAY"])
    .execute();

  await db.schema
    .createType("order_status")
    .asEnum(["PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"])
    .execute();

  // Composite unique constraints required by foreign keys.
  //
  // These constraints allow PostgreSQL to guarantee that users and
  // menu items belong to the same restaurant referenced by an order.
  await db.schema
    .alterTable("users")
    .addUniqueConstraint("users_restaurant_id_id_unique", [
      "restaurant_id",
      "id",
    ])
    .execute();

  await db.schema
    .alterTable("menu_items")
    .addUniqueConstraint("menu_items_restaurant_id_id_unique", [
      "restaurant_id",
      "id",
    ])
    .execute();

  // Orders
  //
  // Columns:
  // - id: UUID, primary key, generated automatically.
  // - restaurant_id: UUID, required, references restaurants(id), ON DELETE RESTRICT.
  // - order_number: INTEGER, required, must be greater than zero.
  // - order_date: DATE, required, defaults to Argentina's local date.
  // - type: order_type ENUM, required.
  // - status: order_status ENUM, required, defaults to PENDING.
  // - customer_name: VARCHAR(150), nullable.
  // - notes: TEXT, nullable.
  // - created_by: UUID, required, references users(id) within the same restaurant.
  // - created_at: TIMESTAMPTZ, required, defaults to now().
  // - updated_at: TIMESTAMPTZ, required, defaults to now().
  //
  // Constraints:
  // - Primary key: id.
  // - Unique: (restaurant_id, id), for composite foreign keys.
  // - Unique: (restaurant_id, order_date, order_number).
  // - Check: order_number > 0.
  // - Check: customer_name must not be empty when provided.
  // - Foreign key: (restaurant_id, created_by) references users(restaurant_id, id).
  //
  // Indexes:
  // - (restaurant_id, status, created_at).
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

  // Order items
  //
  // Columns:
  // - id: UUID, primary key, generated automatically.
  // - restaurant_id: UUID, required, used to enforce restaurant consistency.
  // - order_id: UUID, required, references an order in the same restaurant.
  // - menu_item_id: UUID, required, references a menu item in the same restaurant.
  // - name: VARCHAR(150), required, snapshot of the menu item name.
  // - unit_price: NUMERIC(10,2), required, snapshot of the menu item price.
  // - quantity: INTEGER, required, must be greater than zero.
  // - notes: TEXT, nullable.
  // - created_at: TIMESTAMPTZ, required, defaults to now().
  //
  // Constraints:
  // - Primary key: id.
  // - Foreign key: (restaurant_id, order_id) references orders(restaurant_id, id), ON DELETE CASCADE.
  // - Foreign key: (restaurant_id, menu_item_id) references menu_items(restaurant_id, id), ON DELETE RESTRICT.
  // - Check: name must not be empty.
  // - Check: unit_price >= 0.
  // - Check: quantity > 0.
  //
  // Indexes:
  // - (restaurant_id, order_id).
  // - (restaurant_id, menu_item_id).
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

  // Order sequences
  //
  // Columns:
  // - restaurant_id: UUID, required, references restaurants(id), ON DELETE CASCADE.
  // - date: DATE, required, Argentina's local calendar date.
  // - last_number: INTEGER, required, defaults to 0, must be >= 0.
  //
  // Constraints:
  // - Composite primary key: (restaurant_id, date).
  // - Check: last_number >= 0.
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
