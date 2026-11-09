import { Client } from "pg";

export const createDatabaseIfNotExists = async (connectionString: string) => {
  const databaseUrl = new URL(connectionString);
  const databaseName = databaseUrl.pathname.slice(1);

  if (!databaseName) {
    throw new Error("Database name is required");
  }

  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";

  const client = new Client({
    connectionString: adminUrl.toString(),
  });

  try {
    await client.connect();

    await client.query(
      `
        SELECT pg_advisory_lock(hashtext($1))
      `,
      [databaseName],
    );

    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );

    if (result.rowCount === 0) {
      const safeDatabaseName = `"${databaseName.replace(/"/g, '""')}"`;
      await client.query(`CREATE DATABASE ${safeDatabaseName}`);
    }
  } finally {
    await client.end();
  }
};
