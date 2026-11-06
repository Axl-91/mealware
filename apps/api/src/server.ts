import Fastify from "fastify";
import { env } from "./config/env.js";
import { routes } from "./routes.js";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";

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
    await app.register(cookie);

    await app.register(jwt, {
      secret: env.JWT_SECRET,
      cookie: {
        cookieName: "mealware_token",
        signed: false,
      },
      sign: {
        expiresIn: "1h",
      },
    });

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
