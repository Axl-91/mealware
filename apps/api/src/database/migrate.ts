import { db } from "./database.js";
import { runMigrations } from "./run-migrations.js";

const migrate = async () => {
  try {
    await runMigrations(db);
  } catch (error) {
    console.error("Migration execution failed:", error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
};

await migrate();
