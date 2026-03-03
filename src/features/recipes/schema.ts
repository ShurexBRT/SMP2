import { z } from "zod";

const MealTag = z.enum(["breakfast", "lunch", "dinner"]);

export const RecipeSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  steps: z.array(z.string().min(1)).min(1, "Unesi bar 1 korak"),
  tags: z.array(z.string()).default([]),

  prep_minutes: z.number().nullable().default(null),
  cook_minutes: z.number().nullable().default(null),
  default_servings: z.number().int().min(1).default(2),
  notes: z.string().nullable().default(null),

  // ⚠️ NEMA meal_types u payload-u ka DB.
  // Mi meal tipove čuvamo kao tagove (breakfast/lunch/dinner).
});

export type RecipeInput = z.infer<typeof RecipeSchema>;

export const MEAL_TAGS = MealTag.options; // ["breakfast","lunch","dinner"]