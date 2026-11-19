import type { Generated } from "kysely";

export interface Categories {
  id: Generated<string>;
  name: string;
  created_by: string;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface GetCategoriesPaginatedInput {
  page: number;
  limit: number;
  search?: string;
  status: "active" | "archived";
}
