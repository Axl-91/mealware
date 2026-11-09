import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
  } catch (error) {
    app.log.error(error);
    await app.close();
    process.exit(1);
  }
};

start();
