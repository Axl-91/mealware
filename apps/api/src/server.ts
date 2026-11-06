import Fastify from "fastify";
import { env } from "./config/env.js";
import { routes } from "./routes.js";

const app = Fastify({
  logger:
    env.NODE_ENV === "development"
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          },
        }
      : true,
});

const start = async () => {
  try {
    await app.register(routes);

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
