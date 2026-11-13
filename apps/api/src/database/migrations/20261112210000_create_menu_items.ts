import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  /**
   * TABLE menu_items
   * ----------------
   * id            UUID          PK, DEFAULT gen_random_uuid()
   * restaurant_id UUID          NOT NULL, FK restaurants(id), ON DELETE RESTRICT
   * category_id   UUID          NOT NULL, FK categories(id), ON DELETE RESTRICT
   * name          VARCHAR(150)  NOT NULL, UNIQUE per restaurant (normalized, case-insensitive)
   * description   TEXT          NULL
   * price         NUMERIC(10,2) NOT NULL, CHECK >= 0
   * is_available  BOOLEAN       NOT NULL, DEFAULT true
   * is_active     BOOLEAN       NOT NULL, DEFAULT true
   * created_at    TIMESTAMPTZ   NOT NULL, DEFAULT now()
   * updated_at    TIMESTAMPTZ   NOT NULL, DEFAULT now()
   */
  await db.schema
    .createTable("menu_items")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("restaurant_id", "uuid", (column) =>
      column.notNull().references("restaurants.id").onDelete("restrict"),
    )
    .addColumn("category_id", "uuid", (column) =>
      column.notNull().references("categories.id").onDelete("restrict"),
    )
    .addColumn("name", "varchar(150)", (column) => column.notNull())
    .addColumn("description", "text")
    .addColumn("price", "numeric(10, 2)", (column) => column.notNull())
    .addColumn("is_available", "boolean", (column) =>
      column.notNull().defaultTo(true),
    )
    .addColumn("is_active", "boolean", (column) =>
      column.notNull().defaultTo(true),
    )
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await sql`
    CREATE UNIQUE INDEX menu_items_restaurant_name_unique
    ON menu_items (
      restaurant_id,
      lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
    )
  `.execute(db);

  await sql`
    CREATE INDEX menu_items_category_id_idx
    ON menu_items (category_id)
  `.execute(db);

  await sql`
    ALTER TABLE menu_items
    ADD CONSTRAINT menu_items_name_check
    CHECK (length(btrim(name)) > 0)
  `.execute(db);

  await sql`
    ALTER TABLE menu_items
    ADD CONSTRAINT menu_items_price_check
    CHECK (price >= 0)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("menu_items").execute();
}
