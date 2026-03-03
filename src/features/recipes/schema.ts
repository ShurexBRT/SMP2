import { z } from "zod";

export const MealTypeEnum = z.enum(["breakfast", "lunch", "dinner"]);

export const RecipeSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  steps: z.array(z.string().min(1)).min(1, "Dodaj bar 1 korak"),
  tags: z.array(z.string()).default([]),

  // ✅ NOVO
  meal_types: z.array(MealTypeEnum).min(1, "Izaberi bar jedan tip obroka"),

  prep_minutes: z.number().int().min(0).nullable().default(null),
  cook_minutes: z.number().int().min(0).nullable().default(null),
  default_servings: z.number().int().min(1).default(2),
  notes: z.string().nullable().default(null),
});

export type RecipeInput = z.infer<typeof RecipeSchema>;