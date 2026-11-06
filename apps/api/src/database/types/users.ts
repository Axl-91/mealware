import type { Generated } from "kysely";
import type { UserRole } from "@mealware/shared";

export interface Users {
  id: Generated<string>;
  restaurant_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
