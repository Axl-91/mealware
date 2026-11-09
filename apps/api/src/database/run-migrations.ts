import { Migrator } from "kysely/migration";
import type { Kysely } from "kysely";
import type { Database } from "./types/database.js";
import { createMigrationProvider } from "./migration-provider.js";

export const runMigrations = async (db: Kysely<Database>) => {
  const migrator = new Migrator({
    db,
    provider: createMigrationProvider(),
  });

  const { error, results } = await migrator.migrateToLatest();

  for (const result of results ?? []) {
    if (result.status === "Success") {
      console.log(`Migration completed: ${result.migrationName}`);
    } else if (result.status === "Error") {
      console.error(`Migration failed: ${result.migrationName}`);
    }
  }

  if (error) {
    throw error;
  }
};
