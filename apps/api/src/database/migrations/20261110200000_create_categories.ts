import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  /**
   * TABLE categories
   * ----------------
   * id         UUID         PK, DEFAULT gen_random_uuid()
   * name       VARCHAR(100) NOT NULL, UNIQUE (normalized, case-insensitive)
   * created_by UUID         NOT NULL, FK users(id), ON DELETE RESTRICT
   * is_active  BOOLEAN      NOT NULL, DEFAULT true
   * created_at TIMESTAMPTZ  NOT NULL, DEFAULT now()
   * updated_at TIMESTAMPTZ  NOT NULL, DEFAULT now()
   */
  await db.schema
    .createTable("categories")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("name", "varchar(100)", (column) => column.notNull())
    .addColumn("created_by", "uuid", (column) =>
      column.notNull().references("users.id").onDelete("restrict"),
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
    CREATE UNIQUE INDEX categories_name_unique
    ON categories (
      lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
    )
  `.execute(db);

  await sql`
    ALTER TABLE categories
    ADD CONSTRAINT categories_name_check
    CHECK (
      length(btrim(name)) > 0
      AND position('.' in name) = 0
    )
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("categories").execute();
}
