import { Migrator } from "kysely/migration";
import { db } from "./database.js";
import { createMigrationProvider } from "./migration-provider.js";

const migrator = new Migrator({
  db,
  provider: createMigrationProvider(),
});

const rollbackMigration = async () => {
  try {
    const { error, results } = await migrator.migrateDown();

    for (const result of results ?? []) {
      if (result.status === "Success") {
        console.log(`Migration reverted: ${result.migrationName}`);
      } else if (result.status === "Error") {
        console.error(`Migration rollback failed: ${result.migrationName}`);
      }
    }

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Migration rollback execution failed:", error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
};

await rollbackMigration();
