import type { Restaurants } from "./restaurants.js";
import type { Users } from "./users.js";

export interface Database {
  restaurants: Restaurants;
  users: Users;
}
