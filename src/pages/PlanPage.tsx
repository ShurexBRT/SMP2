import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequireHousehold } from "@/features/household/guard";
import { startOfWeekISO } from "@/lib/utils";
import { listRecipes } from "@/features/recipes/api";
import {
  deleteMealPlanItem,
  getOrCreateMealPlan,
  listMealPlanItems,
  upsertMealPlanItem,
} from "@/features/plan/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type MealType = "breakfast" | "lunch" | "dinner";

const MEALS: { key: MealType; label: string }[] = [
  { key: "breakfast", label: "Doručak" },
  { key: "lunch", label: "Ručak" },
  { key: "dinner", label: "Večera" },
];

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("sr-RS", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function hasMealTag(tags: string[] | null | undefined, meal: MealType): boolean {
  const t = (tags ?? []).map((x) => x.toLowerCase());
  return t.includes(meal);
}

export function PlanPage() {
  const qc = useQueryClient();
  const { householdId, ready } = useRequireHousehold();
  const [weekStart, setWeekStart] = React.useState(() => startOfWeekISO(new Date()));

  const recipesQ = useQuery({
    queryKey: ["recipes", householdId],
    queryFn: () => listRecipes(householdId!),
    enabled: ready,
  });

  const planQ = useQuery({
    queryKey: ["mealPlan", householdId, weekStart],
    queryFn: () => getOrCreateMealPlan({ householdId: householdId!, weekStart }),
    enabled: ready,
  });

  const itemsQ = useQuery({
    queryKey: ["mealPlanItems", householdId, weekStart],
    queryFn: () => listMealPlanItems({ householdId: householdId!, mealPlanId: planQ.data!.id }),
    enabled: ready && !!planQ.data?.id,
  });

  const upsertMut = useMutation({
    mutationFn: upsertMealPlanItem,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["mealPlanItems", householdId, weekStart] });
    },
  });

  const delMut = useMutation({
    mutationFn: deleteMealPlanItem,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["mealPlanItems", householdId, weekStart] });
    },
  });

  if (!ready) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600">
          Prvo napravi household (Nalog) da bi plan bio shared.
        </CardContent>
      </Card>
    );
  }

  const items = itemsQ.data ?? [];
  const recipes = recipesQ.data ?? [];

  const byKey = new Map<string, (typeof items)[number]>();
  for (const it of items) byKey.set(`${it.date}|${it.meal_type}`, it);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Nedeljni plan</h2>
          <div className="text-sm text-neutral-500">Dropdown je filtriran po tagovima breakfast/lunch/dinner.</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setWeekStart(addDaysISO(weekStart, -7))}>
            ← Prethodna
          </Button>
          <div className="text-sm text-neutral-600">
            Od <span className="font-medium">{weekStart}</span>
          </div>
          <Button variant="secondary" onClick={() => setWeekStart(addDaysISO(weekStart, 7))}>
            Sledeća →
          </Button>
        </div>
      </div>

      {(recipesQ.isLoading || planQ.isLoading || itemsQ.isLoading) && (
        <div className="text-sm text-neutral-500">Učitavanje…</div>
      )}

      {(recipesQ.isError || planQ.isError || itemsQ.isError) && (
        <div className="text-sm text-red-600">
          Greška:{" "}
          {(recipesQ.error as any)?.message ||
            (planQ.error as any)?.message ||
            (itemsQ.error as any)?.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ova nedelja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 7 }).map((_, dayIdx) => {
            const date = addDaysISO(weekStart, dayIdx);

            return (
              <div key={date} className="rounded-2xl border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">{formatDayLabel(date)}</div>
                  <div className="text-xs text-neutral-500">{date}</div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {MEALS.map((m) => {
                    const existing = byKey.get(`${date}|${m.key}`);

                    const filtered = recipes.filter((r) => hasMealTag(r.tags, m.key));

                    return (
                      <div key={m.key} className="rounded-2xl border border-neutral-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-sm font-medium">{m.label}</div>
                          {existing ? (
                            <button
                              className="text-xs text-red-600 hover:underline"
                              onClick={() =>
                                delMut.mutate({
                                  householdId: householdId!,
                                  mealPlanId: planQ.data!.id,
                                  date,
                                  mealType: m.key,
                                })
                              }
                            >
                              Ukloni
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-400">—</span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <select
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                            value={existing?.recipe_id ?? ""}
                            onChange={(e) => {
                              const recipeId = e.target.value;
                              if (!recipeId) return;

                              upsertMut.mutate({
                                householdId: householdId!,
                                mealPlanId: planQ.data!.id,
                                date,
                                mealType: m.key,
                                recipeId,
                                servings: existing?.servings ?? 2,
                              });
                            }}
                          >
                            <option value="">Izaberi recept…</option>
                            {filtered.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>

                          {filtered.length === 0 && (
                            <div className="text-xs text-neutral-500">
                              Nema recepata za {m.label}. Uđi u recept i čekiraj Tip obroka.
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-neutral-500">Porcije</div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                disabled={!existing}
                                onClick={() => {
                                  if (!existing) return;
                                  upsertMut.mutate({
                                    householdId: householdId!,
                                    mealPlanId: planQ.data!.id,
                                    date,
                                    mealType: m.key,
                                    recipeId: existing.recipe_id,
                                    servings: Math.max(1, (existing.servings ?? 2) - 1),
                                  });
                                }}
                              >
                                -
                              </Button>

                              <div className="min-w-[24px] text-center text-sm">{existing?.servings ?? "—"}</div>

                              <Button
                                variant="secondary"
                                disabled={!existing}
                                onClick={() => {
                                  if (!existing) return;
                                  upsertMut.mutate({
                                    householdId: householdId!,
                                    mealPlanId: planQ.data!.id,
                                    date,
                                    mealType: m.key,
                                    recipeId: existing.recipe_id,
                                    servings: (existing.servings ?? 2) + 1,
                                  });
                                }}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}