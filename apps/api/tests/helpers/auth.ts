import type { FastifyInstance } from "fastify";

export const login = async (
  app: FastifyInstance,
  email: string,
  password: string,
): Promise<string> => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password },
  });

  if (response.statusCode !== 200) {
    throw new Error(`Login failed with status ${response.statusCode}`);
  }

  const setCookie = response.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;

  if (!cookie) {
    throw new Error("Login response did not include a cookie");
  }

  return cookie.split(";")[0]!;
};
