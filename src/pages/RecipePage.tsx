import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock3,
  UsersRound,
  Pencil,
  Plus,
  Minus,
  Trash2,
  CalendarDays,
  Carrot,
  ListOrdered,
} from 'lucide-react';
import { useRequireHousehold } from '@/features/household/guard';
import { getRecipe, deleteRecipe } from '@/features/recipes/api';
import { listRecipeIngredients } from '@/features/recipes/ingredientsApi';
import { getOrCreateMealPlan, upsertMealPlanItem, listMealPlanItems } from '@/features/plan/api';
import { todayISO, startOfWeekISO } from '@/lib/utils';
import { formatQty, MEALS } from '@/lib/data';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { ErrorNotice, HouseholdGate, Loading } from '@/components/ui/Feedback';
import type { MealType } from '@/lib/types';

export function RecipePage() {
  const { id } = useParams();
  return <RecipeDetail key={id} />;
}

function RecipeDetail() {
  const { id } = useParams();
  const { householdId, ready } = useRequireHousehold();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [portionOverride, setPortionOverride] = useState<number | null>(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [date, setDate] = useState(todayISO);
  const [meal, setMeal] = useState<MealType>('lunch');
  const recipeQ = useQuery({
    queryKey: ['recipe', householdId, id],
    queryFn: () => getRecipe(householdId!, id!),
    enabled: ready && !!id,
  });
  const ingredientsQ = useQuery({
    queryKey: ['recipeIngredients', householdId, id],
    queryFn: () => listRecipeIngredients({ householdId: householdId!, recipeId: id! }),
    enabled: ready && !!id,
  });
  const servings = portionOverride ?? recipeQ.data?.default_servings ?? 2;
  const remove = useMutation({
    mutationFn: () => deleteRecipe(householdId!, id!),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['recipes', householdId] });
      nav('/recipes');
    },
  });
  const addToPlan = useMutation({
    mutationFn: async () => {
      if (!date || Number.isNaN(Date.parse(date))) throw new Error('Izaberi datum obroka.');
      const week = startOfWeekISO(new Date(`${date}T12:00:00`));
      const plan = await getOrCreateMealPlan({ householdId: householdId!, weekStart: week });
      // Replacing a filled slot requires explicit confirmation.
      const existing = (
        await listMealPlanItems({ householdId: householdId!, mealPlanId: plan.id })
      ).find((x) => x.date === date && x.meal_type === meal);
      if (existing && !confirm('Za ovaj termin već postoji obrok. Zameniti ga ovim receptom?'))
        return null;
      await upsertMealPlanItem({
        householdId: householdId!,
        mealPlanId: plan.id,
        date,
        mealType: meal,
        recipeId: id!,
        servings,
      });
      return week;
    },
    onSuccess: async (week) => {
      if (!week) return;
      await qc.invalidateQueries({ queryKey: ['mealPlan', householdId, week] });
      await qc.invalidateQueries({ queryKey: ['mealPlanItems', householdId, week] });
      nav(`/plan?week=${week}`);
    },
  });
  if (!ready) return <HouseholdGate />;
  if (recipeQ.isLoading || ingredientsQ.isLoading) return <Loading />;
  if (recipeQ.error)
    return <ErrorNotice error={recipeQ.error} retry={() => void recipeQ.refetch()} />;
  const r = recipeQ.data;
  if (!r) return null;
  return (
    <div className="recipe-detail page-stack">
      <div className="page-heading">
        <div>
          <Link className="text-link text-xs flex items-center gap-2 mb-4" to="/recipes">
            <ArrowLeft size={15} />
            Recepti
          </Link>
          <h1>{r.name}</h1>
          <div className="flex flex-wrap gap-2 mt-3">
            {r.tags.map((tag) => (
              <span className="badge" key={tag}>
                {MEALS.find((m) => m.key === tag)?.label ?? tag}
              </span>
            ))}
          </div>
        </div>
        <Link className="button button-secondary" to={`/recipes/${id}/edit`}>
          <Pencil size={16} />
          Uredi
        </Link>
      </div>
      <div className="detail-metrics">
        <div className="metric">
          <small>Priprema</small>
          <strong>{r.prep_minutes ?? '—'}</strong> <span className="text-xs muted">min</span>
        </div>
        <div className="metric">
          <small>Kuvanje</small>
          <strong>{r.cook_minutes ?? '—'}</strong> <span className="text-xs muted">min</span>
        </div>
        <div className="metric">
          <small>Porcije</small>
          <div className="stepper justify-center">
            <button
              className="icon-button"
              aria-label="Smanji porcije"
              disabled={servings <= 1}
              onClick={() => setPortionOverride(servings - 1)}
            >
              <Minus size={14} />
            </button>
            <strong>{servings}</strong>
            <button
              className="icon-button"
              aria-label="Povećaj porcije"
              disabled={servings >= 100}
              onClick={() => setPortionOverride(servings + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
      {r.notes && (
        <div className="panel">
          <span className="section-label">Napomena kuvara</span>
          <p className="mt-2 leading-relaxed">{r.notes}</p>
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>
            <Carrot size={19} />
            Sastojci
          </h2>
          <span className="badge">
            <UsersRound size={13} />
            {servings} porcije
          </span>
        </div>
        <ErrorNotice error={ingredientsQ.error} retry={() => void ingredientsQ.refetch()} />
        {ingredientsQ.data?.map((item) => (
          <div className="ingredient-row" key={item.id}>
            <span>
              {item.ingredient_name}
              {item.optional && <small className="muted ml-2">opciono</small>}
            </span>
            <strong className="text-sm whitespace-nowrap">
              {formatQty((item.qty * servings) / r.default_servings)} {item.unit}
            </strong>
          </div>
        ))}
        {!ingredientsQ.error && !ingredientsQ.data?.length && (
          <p className="muted">
            Recept još nema sastojke.{' '}
            <Link className="text-link" to={`/recipes/${id}/edit`}>
              Dodaj ih pre planiranja kupovine.
            </Link>
          </p>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            <ListOrdered size={19} />
            Koraci pripreme
          </h2>
          <Clock3 size={18} className="brand-icon" />
        </div>
        <ol className="recipe-steps">
          {r.steps.map((step, index) => (
            <li className="recipe-step" key={index}>
              <span className="step-number">{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>
      <Button onClick={() => setPlanDialog(true)}>
        <CalendarDays size={18} />
        Dodaj u plan
      </Button>
      <ErrorNotice error={remove.error} />
      <button
        className="text-sm self-center py-3"
        style={{ color: 'var(--danger)' }}
        disabled={remove.isPending}
        onClick={() => {
          if (confirm(`Trajno obrisati recept „${r.name}“?`)) remove.mutate();
        }}
      >
        <Trash2 size={14} className="inline mr-2" />
        {remove.isPending ? 'Brisanje…' : 'Obriši recept'}
      </button>
      {planDialog && (
        <Dialog
          title="Dodaj recept u plan"
          onClose={() => {
            if (!addToPlan.isPending) setPlanDialog(false);
          }}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              addToPlan.mutate();
            }}
          >
            <p className="muted">
              {r.name} · {servings} porcije
            </p>
            <label>
              Datum
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label>
              Obrok
              <select
                className="field"
                value={meal}
                onChange={(e) => setMeal(e.target.value as MealType)}
              >
                {MEALS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <ErrorNotice error={addToPlan.error} />
            <Button type="submit" disabled={addToPlan.isPending}>
              {addToPlan.isPending ? 'Čuvam…' : 'Dodaj u plan'}
            </Button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
