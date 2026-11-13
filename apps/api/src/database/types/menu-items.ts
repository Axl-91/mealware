import type { Generated } from "kysely";

export interface MenuItems {
  id: Generated<string>;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  is_available: Generated<boolean>;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
