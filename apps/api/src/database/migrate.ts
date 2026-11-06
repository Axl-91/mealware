import { Migrator } from "kysely/migration";
import { db } from "./database.js";
import { createMigrationProvider } from "./migration-provider.js";

const migrator = new Migrator({
  db,
  provider: createMigrationProvider(),
});

const runMigrations = async () => {
  try {
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
  } catch (error) {
    console.error("Migration execution failed:", error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
};

await runMigrations();
