import Fastify from "fastify";
import { env } from "./config/env.js";
import { routes } from "./routes.js";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

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

  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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

  if (env.NODE_ENV !== "test") {
    await app.register(swagger, {
      openapi: {
        openapi: "3.0.3",
        info: {
          title: "Mealware API",
          description: "Restaurant management API",
          version: "1.0.0",
        },
        components: {
          securitySchemes: {
            cookieAuth: {
              type: "apiKey",
              in: "cookie",
              name: "mealware_token",
              description: "JWT authentication cookie",
            },
          },
        },
      },
      transform: jsonSchemaTransform,
    });

    await app.register(swaggerUi, {
      routePrefix: "/documentation",
    });
  }

  await app.register(routes);

  return app;
};
