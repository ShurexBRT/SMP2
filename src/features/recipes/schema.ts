import { z } from "zod";

export const RecipeSchema = z.object({
  name: z.string().min(2, "Naziv je prekratak."),
  steps: z.array(z.string().min(1)).min(1, "Dodaj bar 1 korak."),
  tags: z.array(z.string()).default([]),
  prep_minutes: z.number().int().min(0).nullable().optional(),
  cook_minutes: z.number().int().min(0).nullable().optional(),
  default_servings: z.number().int().min(1).default(2),
  notes: z.string().max(2000).nullable().optional(),
});

export type RecipeInput = z.infer<typeof RecipeSchema>;
