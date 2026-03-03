export type UUID = string;

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type HouseholdRole = "owner" | "member";
type MemberStatus = "invited" | "active";
type MealType = "breakfast" | "lunch" | "dinner";
type ShoppingStatus = "open" | "archived";
type ShoppingSource = "plan" | "manual";

type Row<T> = T;
type Insert<T> = T;
type Update<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      households: {
        Row: Row<{
          id: UUID;
          name: string;
          created_at: string;
          created_by: UUID;
        }>;
        Insert: Insert<{
          id?: UUID;
          name: string;
          created_by?: UUID;
        }>;
        Update: Update<{
          name: string;
          created_by: UUID;
        }>;
        Relationships: [];
      };

      household_members: {
        Row: Row<{
          id: UUID;
          household_id: UUID;
          user_id: UUID | null;
          email: string;
          role: HouseholdRole;
          status: MemberStatus;
          created_at: string;
        }>;
        Insert: Insert<{
          id?: UUID;
          household_id: UUID;
          user_id?: UUID | null;
          email: string;
          role?: HouseholdRole;
          status?: MemberStatus;
        }>;
        Update: Update<{
          user_id: UUID | null;
          role: HouseholdRole;
          status: MemberStatus;
        }>;
        Relationships: [];
      };

      recipes: {
        Row: Row<{
          id: UUID;
          household_id: UUID;
          name: string;
          steps: string[];
          tags: string[];
          meal_types: MealType[]; // ✅ NOVO
          prep_minutes: number | null;
          cook_minutes: number | null;
          default_servings: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Insert: Insert<{
          id?: UUID;
          household_id: UUID;
          name: string;
          steps: string[];
          tags?: string[];
          meal_types?: MealType[]; // ✅ NOVO
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          default_servings?: number;
          notes?: string | null;
        }>;
        Update: Update<{
          name: string;
          steps: string[];
          tags: string[];
          meal_types: MealType[]; // ✅ NOVO
          prep_minutes: number | null;
          cook_minutes: number | null;
          default_servings: number;
          notes: string | null;
        }>;
        Relationships: [];
      };

      ingredients: {
        Row: Row<{
          id: UUID;
          household_id: UUID;
          name: string;
          default_unit: string;
          created_at: string;
        }>;
        Insert: Insert<{
          id?: UUID;
          household_id: UUID;
          name: string;
          default_unit: string;
        }>;
        Update: Update<{
          name: string;
          default_unit: string;
        }>;
        Relationships: [];
      };

      recipe_ingredients: {
        Row: Row<{
          id: UUID;
          household_id: UUID;
          recipe_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          optional: boolean;
          created_at: string;
        }>;
        Insert: Insert<{
          id?: UUID;
          household_id: UUID;
          recipe_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          optional?: boolean;
        }>;
        Update: Update<{
          qty: number;
          unit: string;
          optional: boolean;
        }>;
        Relationships: [];
      };

      meal_plans: {
        Row: Row<{
          id: UUID;
          household_id: UUID;
          week_start: string;
          created_at: string;
          updated_at: string;
        }>;
        Insert: Insert<{
          id?: UUID;
          household_id: UUID;
          week_start: string;
        }>;
        Update: Update<{
          week_start: string;
        }>;
        Relationships: [];
      };

      meal_plan_items: {
        Row: Row<{
          id: UUID;
          household_id: UUID;
          meal_plan_id: UUID;
          date: string;
          meal_type: MealType;
          recipe_id: UUID;
          servings: number;
          created_at: string;
        }>;
        Insert: Insert<{
          id?: UUID;
          household_id: UUID;
          meal_plan_id: UUID;
          date: string;
          meal_type: MealType;
          recipe_id: UUID;
          servings: number;
        }>;
        Update: Update<{
          servings: number;
        }>;
        Relationships: [];
      };

      inventory_items: {
        Row: Row<{
          id: UUID;
          household_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          min_qty: number | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Insert: Insert<{
          id?: UUID;
          household_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          min_qty?: number | null;
          expires_at?: string | null;
        }>;
        Update: Update<{
          qty: number;
          unit: string;
          min_qty: number | null;
          expires_at: string | null;
        }>;
        Relationships: [];
      };

      shopping_lists: {
        Row: Row<{
          id: UUID;
          household_id: UUID;
          week_start: string;
          status: ShoppingStatus;
          created_at: string;
        }>;
        Insert: Insert<{
          id?: UUID;
          household_id: UUID;
          week_start: string;
          status?: ShoppingStatus;
        }>;
        Update: Update<{
          status: ShoppingStatus;
        }>;
        Relationships: [];
      };

      shopping_list_items: {
        Row: Row<{
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
        }>;
        Insert: Insert<{
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
        }>;
        Update: Update<{
          label: string;
          qty: number | null;
          unit: string | null;
          category: string;
          checked: boolean;
          source: ShoppingSource;
        }>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}