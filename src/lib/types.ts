/**
 * Minimal Database typing.
 * You can replace this with a generated type later:
 * supabase gen types typescript --project-id ... > src/lib/types.ts
 */

export type UUID = string;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      households: {
        Row: { id: UUID; name: string; created_at: string; created_by: UUID };
        Insert: { id?: UUID; name: string; created_by: UUID };
        Update: { name?: string };
      };
      household_members: {
        Row: {
          id: UUID;
          household_id: UUID;
          user_id: UUID | null;
          email: string;
          role: "owner" | "member";
          status: "invited" | "active";
          created_at: string;
        };
        Insert: {
          id?: UUID;
          household_id: UUID;
          user_id?: UUID | null;
          email: string;
          role?: "owner" | "member";
          status?: "invited" | "active";
        };
        Update: Partial<{
          user_id: UUID | null;
          role: "owner" | "member";
          status: "invited" | "active";
        }>;
      };
      recipes: {
        Row: {
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
        };
        Insert: {
          id?: UUID;
          household_id: UUID;
          name: string;
          steps: string[];
          tags?: string[];
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          default_servings?: number;
          notes?: string | null;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["recipes"]["Insert"], "household_id">>;
      };
      ingredients: {
        Row: { id: UUID; household_id: UUID; name: string; default_unit: string; created_at: string };
        Insert: { id?: UUID; household_id: UUID; name: string; default_unit: string };
        Update: Partial<Omit<Database["public"]["Tables"]["ingredients"]["Insert"], "household_id">>;
      };
      recipe_ingredients: {
        Row: {
          id: UUID;
          household_id: UUID;
          recipe_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          optional: boolean;
          created_at: string;
        };
        Insert: {
          id?: UUID;
          household_id: UUID;
          recipe_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          optional?: boolean;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["recipe_ingredients"]["Insert"], "household_id">>;
      };
      meal_plans: {
        Row: { id: UUID; household_id: UUID; week_start: string; created_at: string; updated_at: string };
        Insert: { id?: UUID; household_id: UUID; week_start: string };
        Update: Partial<Omit<Database["public"]["Tables"]["meal_plans"]["Insert"], "household_id">>;
      };
      meal_plan_items: {
        Row: {
          id: UUID;
          household_id: UUID;
          meal_plan_id: UUID;
          date: string;
          meal_type: "breakfast" | "lunch" | "dinner";
          recipe_id: UUID;
          servings: number;
          created_at: string;
        };
        Insert: {
          id?: UUID;
          household_id: UUID;
          meal_plan_id: UUID;
          date: string;
          meal_type: "breakfast" | "lunch" | "dinner";
          recipe_id: UUID;
          servings: number;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["meal_plan_items"]["Insert"], "household_id">>;
      };
      inventory_items: {
        Row: {
          id: UUID;
          household_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          min_qty: number | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: UUID;
          household_id: UUID;
          ingredient_id: UUID;
          qty: number;
          unit: string;
          min_qty?: number | null;
          expires_at?: string | null;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["inventory_items"]["Insert"], "household_id">>;
      };
      shopping_lists: {
        Row: { id: UUID; household_id: UUID; week_start: string; status: "open" | "archived"; created_at: string };
        Insert: { id?: UUID; household_id: UUID; week_start: string; status?: "open" | "archived" };
        Update: Partial<Omit<Database["public"]["Tables"]["shopping_lists"]["Insert"], "household_id">>;
      };
      shopping_list_items: {
        Row: {
          id: UUID;
          household_id: UUID;
          shopping_list_id: UUID;
          ingredient_id: UUID | null;
          label: string;
          qty: number | null;
          unit: string | null;
          category: string;
          checked: boolean;
          source: "plan" | "manual";
          created_at: string;
        };
        Insert: {
          id?: UUID;
          household_id: UUID;
          shopping_list_id: UUID;
          ingredient_id?: UUID | null;
          label: string;
          qty?: number | null;
          unit?: string | null;
          category: string;
          checked?: boolean;
          source?: "plan" | "manual";
        };
        Update: Partial<Omit<Database["public"]["Tables"]["shopping_list_items"]["Insert"], "household_id">>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
