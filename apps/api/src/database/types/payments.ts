import type { Generated } from "kysely";

export type PaymentMethod = "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "TRANSFER";

export interface Payments {
  id: Generated<string>;
  restaurant_id: string;
  order_id: string;
  method: PaymentMethod;
  amount: string;
  created_by: string;
  created_at: Generated<Date>;
}

export interface Refunds {
  id: Generated<string>;
  restaurant_id: string;
  payment_id: string;
  amount: string;
  created_by: string;
  created_at: Generated<Date>;
}
