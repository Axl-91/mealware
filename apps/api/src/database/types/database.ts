import type { Restaurants } from "./restaurants.js";
import type { Users } from "./users.js";
import type { Categories } from "./categories.js";
import type { MenuItems } from "./menu-items.js";
import type { Orders, OrderItems, OrderSequences } from "./orders.js";
import type { Payments, Refunds } from "./payments.js";

export interface Database {
  restaurants: Restaurants;
  users: Users;
  categories: Categories;
  menu_items: MenuItems;
  orders: Orders;
  order_items: OrderItems;
  order_sequences: OrderSequences;
  payments: Payments;
  refunds: Refunds;
}
