// src/lib/types.ts
// Minimal, stable Supabase Database typing for supabase-js v2.
// Key detail: each table MUST include `Relationships` (even empty),
// otherwise supabase-js generics can degrade to `never`.

export type UUID = string;

type HouseholdRole = "owner" | "member";
type MemberStatus = "invited" | "active";
type MealType = "breakfast" | "lunch" | "dinner";
type ShoppingStatus = "open" | "archived";
type ShoppingSource = "plan" | "manual";

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      households: Table<
        {
          id: UUID;
          name: string;
          created_at: string;
          created_by: UUID;
        },
        {
          id?: UUID;
          name: string;
          created_by: UUID;
        },
        {
          name?: string;
        }
      >;

      household_members: Table<
        {
          id: UUID;
          household_id: UUID;
          user_id: UUID | null;
          email: string;
          role: HouseholdRole;
          status: MemberStatus;
          created_at: string;
        },
        {
          id?: UUID;
          household_id: UUID;
          user_id?: UUID | null;
          email: string;
          role?: HouseholdRole;
          status?: MemberStatus;
        },
        {
          user_id?: UUID | null;
          role?: HouseholdRole;
          status?: MemberStatus;
        }
      >;

      recipes: Table<
        {
          id: UUID;
          household_id: UUID;
          name: string;
          steps: string[];
          tags: string[];
          prep_minutes: number | null;
          cook_minutes: number | null;
          default_servings: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: UUID;
          household_id: UUID;
          name: string;
          steps: string[];
          tags?: string[];
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          default_servings?: number;
          notes?: string | null;
        },
        {
          name?: string;
          steps?: string[];
          tags?: string[];
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          default_servings?: number;
          notes?: string | null;
        }
      >;

      ingredients: Table<
        {
          id: UUID;
          household_id: UUID;
          name: string;
          default_unit: string;
          created_at: string;
        },
        {
          id?: UUID;
          household_id: UUID;
          name: string;
          default_unit: string;
        },
        {
          name?: string;
          default_unit?: string;
        }
      >;

      recipe_ingredients: Table<
        {
          id: UUID;
          household_id: UUID;
          recipe_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          optional: boolean;
          created_at: string;
        },
        {
          id?: UUID;
          household_id: UUID;
          recipe_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          optional?: boolean;
        },
        {
          qty?: number;
          unit?: string;
          optional?: boolean;
        }
      >;

      meal_plans: Table<
        {
          id: UUID;
          household_id: UUID;
          week_start: string; // YYYY-MM-DD
          created_at: string;
          updated_at: string;
        },
        {
          id?: UUID;
          household_id: UUID;
          week_start: string;
        },
        {
          week_start?: string;
        }
      >;

      meal_plan_items: Table<
        {
          id: UUID;
          household_id: UUID;
          meal_plan_id: UUID;
          date: string; // YYYY-MM-DD
          meal_type: MealType;
          recipe_id: UUID;
          servings: number;
          created_at: string;
        },
        {
          id?: UUID;
          household_id: UUID;
          meal_plan_id: UUID;
          date: string;
          meal_type: MealType;
          recipe_id: UUID;
          servings: number;
        },
        {
          date?: string;
          meal_type?: MealType;
          recipe_id?: UUID;
          servings?: number;
        }
      >;

      inventory_items: Table<
        {
          id: UUID;
          household_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          min_qty: number | null;
          expires_at: string | null; // YYYY-MM-DD
          created_at: string;
          updated_at: string;
        },
        {
          id?: UUID;
          household_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          min_qty?: number | null;
          expires_at?: string | null;
        },
        {
          qty?: number;
          unit?: string;
          min_qty?: number | null;
          expires_at?: string | null;
        }
      >;

      shopping_lists: Table<
        {
          id: UUID;
          household_id: UUID;
          week_start: string; // YYYY-MM-DD
          status: ShoppingStatus;
          created_at: string;
        },
        {
          id?: UUID;
          household_id: UUID;
          week_start: string;
          status?: ShoppingStatus;
        },
        {
          status?: ShoppingStatus;
        }
      >;

      shopping_list_items: Table<
        {
          id: UUID;
          household_id: UUID;
          shopping_list_id: UUID;
          ingredient_id: UUID | null;
          label: string;
          qty: number | null;
          unit: string | null;
          category: string;
          checked: boolean;
          source: ShoppingSource;
          created_at: string;
        },
        {
          id?: UUID;
          household_id: UUID;
          shopping_list_id: UUID;
          ingredient_id?: UUID | null;
          label: string;
          qty?: number | null;
          unit?: string | null;
          category: string;
          checked?: boolean;
          source?: ShoppingSource;
        },
        {
          ingredient_id?: UUID | null;
          label?: string;
          qty?: number | null;
          unit?: string | null;
          category?: string;
          checked?: boolean;
          source?: ShoppingSource;
        }
      >;
    };

    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}