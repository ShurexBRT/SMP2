import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequireHousehold } from "@/features/household/guard";
import { createRecipe, deleteRecipe, getRecipe, updateRecipe } from "@/features/recipes/api";
import { RecipeSchema, type RecipeInput, MEAL_TAGS } from "@/features/recipes/schema";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type MealKey = "breakfast" | "lunch" | "dinner";

const MEAL_TYPES: { key: MealKey; label: string }[] = [
  { key: "breakfast", label: "Doručak" },
  { key: "lunch", label: "Ručak" },
  { key: "dinner", label: "Večera" },
];

function normalizeTags(list: string[]) {
  return Array.from(new Set(list.map((t) => t.trim()).filter(Boolean)));
}

function extractMealTags(tags: string[]): MealKey[] {
  const set = new Set(tags);
  return (MEAL_TAGS as MealKey[]).filter((m) => set.has(m));
}

function applyMealTags(tags: string[], mealTypes: MealKey[]) {
  // izbaci stare meal tagove, ubaci nove
  const withoutMeal = tags.filter((t) => !(MEAL_TAGS as string[]).includes(t));
  return normalizeTags([...withoutMeal, ...mealTypes]);
}

export function RecipeEditorPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { householdId, ready } = useRequireHousehold();

  const q = useQuery({
    queryKey: ["recipe", householdId, id],
    queryFn: () => getRecipe(householdId!, id!),
    enabled: ready && mode === "edit" && !!id,
  });

  const [name, setName] = React.useState("");
  const [tags, setTags] = React.useState<string>(""); // comma-separated (bez meal tagova u inputu)
  const [prep, setPrep] = React.useState<string>("");
  const [cook, setCook] = React.useState<string>("");
  const [servings, setServings] = React.useState<string>("2");
  const [notes, setNotes] = React.useState<string>("");
  const [steps, setSteps] = React.useState<string[]>([""]);

  // ✅ meal tipovi se čuvaju kao tagovi, ali UI drži zasebno
  const [mealTypes, setMealTypes] = React.useState<MealKey[]>(["lunch"]);

  React.useEffect(() => {
    if (q.data && mode === "edit") {
      setName(q.data.name);
      const allTags = normalizeTags(q.data.tags ?? []);
      const meals = extractMealTags(allTags);
      setMealTypes(meals.length ? meals : ["lunch"]);

      // UI "Tagovi (zarez)" NE prikazuje meal tagove da ne pravi konfuziju
      const nonMealTags = allTags.filter((t) => !(MEAL_TAGS as string[]).includes(t));
      setTags(nonMealTags.join(", "));

      setPrep(q.data.prep_minutes?.toString() ?? "");
      setCook(q.data.cook_minutes?.toString() ?? "");
      setServings(q.data.default_servings?.toString() ?? "2");
      setNotes(q.data.notes ?? "");
      setSteps(q.data.steps?.length ? q.data.steps : [""]);
    }
  }, [q.data, mode]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const rawTags = normalizeTags(
        tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      );

      const mergedTags = applyMealTags(rawTags, mealTypes);

      const input: RecipeInput = RecipeSchema.parse({
        name,
        steps: steps.map((s) => s.trim()).filter(Boolean),
        tags: mergedTags,
        prep_minutes: prep.trim() ? Number(prep) : null,
        cook_minutes: cook.trim() ? Number(cook) : null,
        default_servings: Number(servings || 2),
        notes: notes.trim() ? notes : null,
      });

      if (mode === "create") {
        return createRecipe({
          household_id: householdId!,
          ...input,
        });
      }
      return updateRecipe(householdId!, id!, input);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recipes", householdId] });
      nav("/recipes");
    },
  });

  const delMut = useMutation({
    mutationFn: async () => deleteRecipe(householdId!, id!),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recipes", householdId] });
      nav("/recipes");
    },
  });

  if (!ready) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recept</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600">Prvo napravi household u sekciji Nalog.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{mode === "create" ? "Novi recept" : "Uredi recept"}</h2>
          <div className="text-sm text-neutral-500">Text-only MVP. Sastojci stižu sledeće.</div>
        </div>

        <div className="flex gap-2">
          {mode === "edit" && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Obrisati recept?")) delMut.mutate();
              }}
              disabled={delMut.isPending}
            >
              Obriši
            </Button>
          )}
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Čuvam…" : "Sačuvaj"}
          </Button>
        </div>
      </div>

      {q.isLoading && mode === "edit" && <div className="text-sm text-neutral-500">Učitavanje…</div>}
      {q.isError && <div className="text-sm text-red-600">Greška: {(q.error as any)?.message}</div>}
      {saveMut.isError && <div className="text-sm text-red-600">Greška: {(saveMut.error as any)?.message}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Osnovno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Naziv</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="npr. Piletina sa pirinčem" />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Tip obroka</label>
            <div className="flex flex-wrap gap-3">
              {MEAL_TYPES.map((t) => {
                const checked = mealTypes.includes(t.key);
                return (
                  <label
                    key={t.key}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                      checked ? "border-neutral-400 bg-neutral-50" : "border-neutral-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setMealTypes((prev) => normalizeTags([...prev, t.key]) as MealKey[]);
                        else setMealTypes((prev) => prev.filter((x) => x !== t.key));
                      }}
                    />
                    {t.label}
                  </label>
                );
              })}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Ovo se čuva kao tagovi: <span className="font-mono">breakfast/lunch/dinner</span>.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Prep (min)</label>
              <Input inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} placeholder="15" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Cook (min)</label>
              <Input inputMode="numeric" value={cook} onChange={(e) => setCook(e.target.value)} placeholder="25" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Porcije</label>
              <Input inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="2" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Tagovi (zarez)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="brzo, fit, jeftino" />
            <div className="mt-1 text-xs text-neutral-500">
              Ne moraš ovde da pišeš breakfast/lunch/dinner — to radi checkbox iznad.
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Napomena</label>
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcionalno…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Koraci</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((s, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={s}
                onChange={(e) => {
                  const next = [...steps];
                  next[idx] = e.target.value;
                  setSteps(next);
                }}
                placeholder={`Korak ${idx + 1}`}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const next = steps.filter((_, i) => i !== idx);
                  setSteps(next.length ? next : [""]);
                }}
                aria-label="Ukloni korak"
              >
                -
              </Button>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setSteps((prev) => [...prev, ""])}>
            + Dodaj korak
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sastojci</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600">
          Sledeće: ingredient editor + recipe_ingredients.
        </CardContent>
      </Card>
    </div>
  );
}