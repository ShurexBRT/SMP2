export type UUID = string;

export type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type HouseholdRole = "owner" | "member";
export type MemberStatus = "invited" | "active";
export type MealType = "breakfast" | "lunch" | "dinner";
export type ShoppingStatus = "open" | "archived";
export type ShoppingSource = "plan" | "manual";

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
          created_by?: UUID; // DB može default auth.uid()
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
          week_start: string;
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
          date: string;
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
          expires_at: string | null;
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
          week_start: string;
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