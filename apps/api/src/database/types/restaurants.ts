import type { Generated } from "kysely";

export interface Restaurants {
  id: Generated<string>;
  name: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
