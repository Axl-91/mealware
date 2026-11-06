import type { UserRole } from "@mealware/shared";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      restaurantId: string;
      role: UserRole;
    };
    user: {
      sub: string;
      restaurantId: string;
      role: UserRole;
    };
  }
}
