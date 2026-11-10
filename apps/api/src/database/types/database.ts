import type { Restaurants } from "./restaurants.js";
import type { Users } from "./users.js";
import type { Categories } from "./categories.js";

export interface Database {
  restaurants: Restaurants;
  users: Users;
  categories: Categories;
}
