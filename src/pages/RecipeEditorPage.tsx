import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Save, BookOpen, ListOrdered, Carrot } from 'lucide-react';
import { z } from 'zod';
import { useRequireHousehold } from '@/features/household/guard';
import { createRecipe, updateRecipe, getRecipe } from '@/features/recipes/api';
import { RecipeSchema } from '@/features/recipes/schema';
import {
  listRecipeIngredients,
  addRecipeIngredient,
  updateRecipeIngredient,
  deleteRecipeIngredient,
} from '@/features/recipes/ingredientsApi';
import { listIngredients, upsertIngredientByName } from '@/features/ingredients/api';
import { MEALS, parseQuantity } from '@/lib/data';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorNotice, HouseholdGate, Loading } from '@/components/ui/Feedback';

type IngredientDraft = {
  key: string;
  id?: string;
  ingredientId?: string;
  name: string;
  qty: string;
  unit: string;
  optional: boolean;
};
const newIngredient = (): IngredientDraft => ({
  key: crypto.randomUUID(),
  name: '',
  qty: '1',
  unit: 'kom',
  optional: false,
});

function RecipeEditorForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { householdId, ready } = useRequireHousehold();
  const savedId = useRef<string | undefined>(id);
  const initialized = useRef<string | undefined>();
  const originalIds = useRef<string[]>([]);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [prep, setPrep] = useState('');
  const [cook, setCook] = useState('');
  const [servings, setServings] = useState('2');
  const [notes, setNotes] = useState('');
  const [steps, setSteps] = useState(['']);
  const [meals, setMeals] = useState<string[]>(['lunch']);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(() => [newIngredient()]);
  const [dirty, setDirty] = useState(false);
  const dataQ = useQuery({
    queryKey: ['recipeEditor', householdId, id],
    enabled: ready && mode === 'edit' && !!id,
    queryFn: async () => {
      const [recipe, rows] = await Promise.all([
        getRecipe(householdId!, id!),
        listRecipeIngredients({ householdId: householdId!, recipeId: id! }),
      ]);
      return { recipe, rows };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    staleTime: 0,
  });
  const catalogueQ = useQuery({
    queryKey: ['ingredients', householdId],
    queryFn: () => listIngredients(householdId!),
    enabled: ready,
  });
  useEffect(() => {
    if (!dataQ.data || dataQ.isFetching || !dataQ.isSuccess || initialized.current === id) return;
    initialized.current = id;
    const { recipe: r, rows } = dataQ.data;
    savedId.current = r.id;
    setName(r.name);
    setTags(r.tags.filter((t) => !MEALS.some((m) => m.key === t)).join(', '));
    setMeals(r.tags.filter((t) => MEALS.some((m) => m.key === t)));
    setPrep(r.prep_minutes?.toString() ?? '');
    setCook(r.cook_minutes?.toString() ?? '');
    setServings(String(r.default_servings));
    setNotes(r.notes ?? '');
    setSteps(r.steps.length ? r.steps : ['']);
    setIngredients(
      rows.length
        ? rows.map((row) => ({
            key: row.id,
            id: row.id,
            ingredientId: row.ingredient_id,
            name: row.ingredient_name,
            qty: String(row.qty),
            unit: row.unit,
            optional: row.optional,
          }))
        : [newIngredient()]
    );
    originalIds.current = rows.map((row) => row.id);
  }, [dataQ.data, dataQ.isFetching, dataQ.isSuccess, id]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  const save = useMutation({
    mutationFn: async () => {
      let input;
      try {
        input = RecipeSchema.parse({
          name,
          steps: steps.map((x) => x.trim()).filter(Boolean),
          tags: Array.from(
            new Set([
              ...tags
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean),
              ...meals,
            ])
          ),
          prep_minutes: prep.trim() ? parseQuantity(prep, 'Vreme pripreme') : null,
          cook_minutes: cook.trim() ? parseQuantity(cook, 'Vreme kuvanja') : null,
          default_servings: parseQuantity(servings, 'Broj porcija', false),
          notes: notes.trim() || null,
        });
      } catch (error) {
        if (error instanceof z.ZodError) throw new Error(error.issues[0].message);
        throw error;
      }
      if (!meals.length) throw new Error('Izaberi bar jedan tip obroka.');
      const rows = ingredients.filter((x) => x.name.trim());
      if (!rows.length) throw new Error('Dodaj bar jedan sastojak.');
      const validated = rows.map((row) => ({
        ...row,
        amount: parseQuantity(row.qty, `Količina za ${row.name}`, false),
      }));
      if (validated.some((x) => !x.unit.trim()))
        throw new Error('Unesi jedinicu mere za svaki sastojak.');
      // The retry retains created row IDs so a partial network failure does not create another recipe.
      if (!savedId.current)
        savedId.current = (await createRecipe({ household_id: householdId!, ...input })).id;
      else await updateRecipe(householdId!, savedId.current, input);
      const recipeId = savedId.current;
      for (const row of validated) {
        if (row.id) {
          await updateRecipeIngredient({
            householdId: householdId!,
            id: row.id,
            qty: row.amount,
            unit: row.unit.trim(),
            optional: row.optional,
          });
        } else {
          const ing = await upsertIngredientByName({
            householdId: householdId!,
            name: row.name,
            defaultUnit: row.unit,
          });
          const created = await addRecipeIngredient({
            householdId: householdId!,
            recipeId,
            ingredientId: ing.id,
            qty: row.amount,
            unit: row.unit.trim(),
            optional: row.optional,
          });
          row.id = created.id;
          originalIds.current.push(created.id);
          setIngredients((current) =>
            current.map((x) =>
              x.key === row.key ? { ...x, id: created.id, ingredientId: ing.id } : x
            )
          );
        }
      }
      // Remove explicitly deleted rows only after all additions/updates have succeeded.
      const keptIds = new Set(validated.map((x) => x.id));
      for (const oldId of [...originalIds.current])
        if (!keptIds.has(oldId)) {
          await deleteRecipeIngredient({ householdId: householdId!, id: oldId });
          originalIds.current = originalIds.current.filter((x) => x !== oldId);
        }
      return recipeId;
    },
    onSuccess: async (recipeId) => {
      setDirty(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['recipes', householdId] }),
        qc.invalidateQueries({ queryKey: ['recipe', householdId, recipeId] }),
        qc.invalidateQueries({ queryKey: ['recipeIngredients', householdId, recipeId] }),
        qc.invalidateQueries({ queryKey: ['recipeSearchIngredients', householdId] }),
        qc.invalidateQueries({ queryKey: ['ingredients', householdId] }),
        qc.invalidateQueries({
          queryKey: ['recipeEditor', householdId, recipeId],
          refetchType: 'none',
        }),
      ]);
      nav(`/recipes/${recipeId}`, { replace: true });
    },
  });
  useEffect(() => {
    const protectDraft = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest('a[href]');
      if (
        !link ||
        !(dirty || save.isPending) ||
        event.ctrlKey ||
        event.metaKey ||
        event.button !== 0
      )
        return;
      if (save.isPending || !confirm('Napustiti stranicu bez čuvanja izmena?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', protectDraft, true);
    return () => document.removeEventListener('click', protectDraft, true);
  }, [dirty, save.isPending]);
  if (!ready) return <HouseholdGate />;
  if (mode === 'edit' && (dataQ.isLoading || (!initialized.current && dataQ.isFetching)))
    return <Loading />;
  if (dataQ.error) return <ErrorNotice error={dataQ.error} retry={() => void dataQ.refetch()} />;
  const updateIngredient = (key: string, patch: Partial<IngredientDraft>) =>
    setIngredients((current) => current.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const cancel = () => {
    if (!save.isPending && (!dirty || confirm('Napustiti stranicu bez čuvanja izmena?')))
      nav(id ? `/recipes/${id}` : '/recipes');
  };
  return (
    <form
      className="page-stack"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      onChange={() => setDirty(true)}
    >
      <div className="page-heading">
        <div>
          <button
            type="button"
            className="text-link flex items-center gap-2 mb-3 text-xs"
            onClick={cancel}
          >
            <ArrowLeft size={15} />
            Recepti
          </button>
          <h1>{mode === 'create' ? 'Dodaj novi recept' : 'Uredi recept'}</h1>
        </div>
        <Button type="submit" disabled={save.isPending}>
          <Save size={16} />
          {save.isPending ? 'Čuvam…' : 'Sačuvaj'}
        </Button>
      </div>
      <ErrorNotice error={save.error} />
      <fieldset disabled={save.isPending} className="editor-layout">
        <div className="page-stack">
          <section className="panel form-stack">
            <div className="panel-heading">
              <h2>
                <BookOpen size={19} />
                Osnovne informacije
              </h2>
            </div>
            <label>
              Naziv recepta
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                placeholder="npr. Piletina sa pirinčem"
              />
            </label>
            <div>
              <label>Tip obroka</label>
              <div className="chips mt-2">
                {MEALS.map((meal) => (
                  <label className="chip" key={meal.key}>
                    <input
                      type="checkbox"
                      checked={meals.includes(meal.key)}
                      onChange={(e) =>
                        setMeals((prev) =>
                          e.target.checked
                            ? [...prev, meal.key]
                            : prev.filter((x) => x !== meal.key)
                        )
                      }
                    />
                    {meal.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-grid">
              <label>
                Priprema (min)
                <Input
                  inputMode="numeric"
                  value={prep}
                  onChange={(e) => setPrep(e.target.value)}
                  placeholder="15"
                />
              </label>
              <label>
                Kuvanje (min)
                <Input
                  inputMode="numeric"
                  value={cook}
                  onChange={(e) => setCook(e.target.value)}
                  placeholder="25"
                />
              </label>
              <label>
                Porcije
                <Input
                  inputMode="numeric"
                  required
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </label>
            </div>
            <label>
              Oznake (odvojene zarezom)
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="brzo, porodično, vegetarijansko"
              />
            </label>
            <label>
              Napomena (opciono)
              <textarea
                className="field"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Vaši mali trikovi za još bolji obrok…"
              />
            </label>
          </section>
          <section className="panel form-stack">
            <div className="panel-heading">
              <h2>
                <ListOrdered size={19} />
                Priprema
              </h2>
              <span className="badge">{steps.length} koraka</span>
            </div>
            {steps.map((step, index) => (
              <div className="flex gap-3 items-start" key={index}>
                <span className="step-number mt-2">{index + 1}</span>
                <textarea
                  className="field"
                  aria-label={`Korak ${index + 1}`}
                  value={step}
                  onChange={(e) =>
                    setSteps((prev) => prev.map((x, i) => (i === index ? e.target.value : x)))
                  }
                  placeholder="Opiši korak pripreme…"
                />
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Ukloni korak ${index + 1}`}
                  onClick={() => {
                    setSteps((prev) =>
                      prev.length > 1 ? prev.filter((_, i) => i !== index) : ['']
                    );
                    setDirty(true);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSteps((prev) => [...prev, '']);
                setDirty(true);
              }}
            >
              <Plus size={17} />
              Dodaj korak
            </Button>
          </section>
        </div>
        <section className="panel form-stack">
          <div className="panel-heading">
            <h2>
              <Carrot size={19} />
              Sastojci
            </h2>
            <span className="badge">{ingredients.filter((x) => x.name).length}</span>
          </div>
          <p className="muted text-xs">
            Količine su za {servings || 'izabrani broj'} porcije. Sastojke i recept čuvaš zajedno.
          </p>
          <datalist id="ingredient-names">
            {catalogueQ.data?.map((x) => (
              <option key={x.id} value={x.name} />
            ))}
          </datalist>
          {ingredients.map((row) => (
            <div className="ingredient-edit form-stack" key={row.key}>
              <div className="form-grid">
                <label>
                  Namirnica
                  <Input
                    list={row.id ? undefined : 'ingredient-names'}
                    disabled={!!row.id}
                    value={row.name}
                    onChange={(e) => updateIngredient(row.key, { name: e.target.value })}
                    placeholder="npr. Pirinač"
                  />
                </label>
                <label>
                  Količina
                  <Input
                    inputMode="decimal"
                    value={row.qty}
                    onChange={(e) => updateIngredient(row.key, { qty: e.target.value })}
                  />
                </label>
                <label>
                  Jedinica
                  <Input
                    value={row.unit}
                    onChange={(e) => updateIngredient(row.key, { unit: e.target.value })}
                    placeholder="g / ml / kom"
                  />
                </label>
                <button
                  type="button"
                  className="icon-button self-end"
                  aria-label={`Ukloni sastojak ${row.name || 'bez naziva'}`}
                  onClick={() => {
                    setIngredients((prev) => prev.filter((x) => x.key !== row.key));
                    setDirty(true);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={row.optional}
                  onChange={(e) => updateIngredient(row.key, { optional: e.target.checked })}
                />
                Neobavezan sastojak
              </label>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIngredients((prev) => [...prev, newIngredient()]);
              setDirty(true);
            }}
          >
            <Plus size={17} />
            Dodaj sastojak
          </Button>
        </section>
      </fieldset>
      <div className="action-row justify-end">
        <button
          type="button"
          className="button button-ghost"
          onClick={cancel}
          disabled={save.isPending}
        >
          Otkaži
        </button>
        <Button type="submit" disabled={save.isPending}>
          <Save size={16} />
          {save.isPending ? 'Čuvam…' : 'Sačuvaj recept'}
        </Button>
      </div>
    </form>
  );
}

export function RecipeEditorPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  return <RecipeEditorForm key={`${mode}:${id ?? 'new'}`} mode={mode} />;
}
