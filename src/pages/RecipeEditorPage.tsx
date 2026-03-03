import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequireHousehold } from "@/features/household/guard";
import { createRecipe, deleteRecipe, getRecipe, updateRecipe } from "@/features/recipes/api";
import { RecipeSchema, type RecipeInput } from "@/features/recipes/schema";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

function normalizeTags(raw: string) {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
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
    staleTime: 30_000,
  });

  const [name, setName] = React.useState("");
  const [tags, setTags] = React.useState<string>(""); // comma-separated
  const [prep, setPrep] = React.useState<string>("");
  const [cook, setCook] = React.useState<string>("");
  const [servings, setServings] = React.useState<string>("2");
  const [notes, setNotes] = React.useState<string>("");
  const [steps, setSteps] = React.useState<string[]>([""]);

  // Prevent overwriting user edits if query refetches
  const hydratedRef = React.useRef(false);

  React.useEffect(() => {
    if (mode !== "edit") return;
    if (!q.data) return;
    if (hydratedRef.current) return;

    hydratedRef.current = true;
    setName(q.data.name ?? "");
    setTags((q.data.tags ?? []).join(", "));
    setPrep(q.data.prep_minutes?.toString() ?? "");
    setCook(q.data.cook_minutes?.toString() ?? "");
    setServings((q.data.default_servings ?? 2).toString());
    setNotes(q.data.notes ?? "");
    setSteps(q.data.steps?.length ? q.data.steps : [""]);
  }, [q.data, mode]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const input: RecipeInput = RecipeSchema.parse({
        name: name.trim(),
        steps: steps.map((s) => s.trim()).filter(Boolean),
        tags: normalizeTags(tags),
        prep_minutes: prep.trim() ? Number(prep) : null,
        cook_minutes: cook.trim() ? Number(cook) : null,
        default_servings: Number(servings || 2),
        notes: notes.trim() ? notes.trim() : null,
      });

      if (mode === "create") {
        return createRecipe({
          household_id: householdId!,
          ...input,
          tags: input.tags ?? [],
          steps: input.steps ?? [],
        });
      }

      // update expects partial; we send full validated payload (safe)
      return updateRecipe(householdId!, id!, {
        ...input,
        tags: input.tags ?? [],
        steps: input.steps ?? [],
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recipes", householdId] });
      await qc.invalidateQueries({ queryKey: ["recipe", householdId, id] });
      nav("/recipes");
    },
  });

  const delMut = useMutation({
    mutationFn: async () => deleteRecipe(householdId!, id!),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recipes", householdId] });
      await qc.invalidateQueries({ queryKey: ["recipe", householdId, id] });
      nav("/recipes");
    },
  });

  const canSave =
    ready &&
    name.trim().length > 0 &&
    !saveMut.isPending &&
    !(mode === "edit" && (q.isLoading || !id));

  if (!ready) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recept</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600">
          Prvo napravi household u sekciji Nalog.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{mode === "create" ? "Novi recept" : "Uredi recept"}</h2>
          <div className="text-sm text-neutral-500">Samo tekst za sada, slike kasnije.</div>
        </div>

        <div className="flex gap-2">
          {mode === "edit" && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Obrisati recept?")) delMut.mutate();
              }}
              disabled={delMut.isPending || q.isLoading}
            >
              {delMut.isPending ? "Brišem…" : "Obriši"}
            </Button>
          )}

          <Button onClick={() => saveMut.mutate()} disabled={!canSave}>
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

          <Button type="button" variant="secondary" onClick={() => setSteps([...steps, ""])}>
            + Dodaj korak
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sastojci</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600">
          MVP skeleton: ovde sledeće dodajemo ingredient editor + recipe_ingredients.
        </CardContent>
      </Card>
    </div>
  );
}