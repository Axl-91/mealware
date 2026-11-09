import Fastify from "fastify";
import { env } from "./config/env.js";
import { routes } from "./routes.js";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";

export const buildApp = async () => {
  const app = Fastify({
    logger:
      env.NODE_ENV === "test"
        ? false
        : env.NODE_ENV === "development"
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

  return app;
};
