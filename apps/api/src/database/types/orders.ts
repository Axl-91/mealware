import type { Generated } from "kysely";

export type OrderType = "DINE_IN" | "TAKEAWAY";

export type OrderStatus =
  "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

export interface Orders {
  id: Generated<string>;
  restaurant_id: string;
  order_number: number;
  order_date: string;
  type: OrderType;
  status: Generated<OrderStatus>;
  customer_name: string | null;
  notes: string | null;
  created_by: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface OrderItems {
  id: Generated<string>;
  restaurant_id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  unit_price: string;
  quantity: number;
  notes: string | null;
  created_at: Generated<Date>;
}

export interface OrderSequences {
  restaurant_id: string;
  date: string;
  last_number: Generated<number>;
}
