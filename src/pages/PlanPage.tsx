import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Minus,
  X,
  Search,
  Clock3,
  ShoppingBasket,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useRequireHousehold } from '@/features/household/guard';
import {
  startOfWeekISO,
  addDaysISO,
  formatDate,
  todayISO,
  weekLabel,
  validWeek,
} from '@/lib/utils';
import { listRecipes } from '@/features/recipes/api';
import {
  getMealPlan,
  getOrCreateMealPlan,
  listMealPlanItems,
  upsertMealPlanItem,
  deleteMealPlanItem,
} from '@/features/plan/api';
import { MEALS, totalMinutes, type Row } from '@/lib/data';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { ErrorNotice, HouseholdGate, Loading } from '@/components/ui/Feedback';

type Slot = { date: string; mealType: Row<'meal_plan_items'>['meal_type'] };
export function PlanPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { householdId, ready } = useRequireHousehold();
  const currentWeek = startOfWeekISO(new Date());
  const rawWeek = params.get('week');
  const weekStart = validWeek(rawWeek);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const recipesQ = useQuery({
    queryKey: ['recipes', householdId],
    queryFn: () => listRecipes(householdId!),
    enabled: ready,
  });
  const planQ = useQuery({
    queryKey: ['mealPlan', householdId, weekStart],
    queryFn: () => getMealPlan({ householdId: householdId!, weekStart }),
    enabled: ready,
  });
  const itemsQ = useQuery({
    queryKey: ['mealPlanItems', householdId, weekStart],
    queryFn: () => listMealPlanItems({ householdId: householdId!, mealPlanId: planQ.data!.id }),
    enabled: ready && !!planQ.data,
  });
  const save = useMutation({
    mutationFn: async (change: Slot & { recipeId: string; servings: number }) => {
      const plan = await getOrCreateMealPlan({ householdId: householdId!, weekStart });
      await upsertMealPlanItem({ householdId: householdId!, mealPlanId: plan.id, ...change });
    },
    onSuccess: async () => {
      setSlot(null);
      await qc.invalidateQueries({ queryKey: ['mealPlan', householdId, weekStart] });
      await qc.invalidateQueries({ queryKey: ['mealPlanItems', householdId, weekStart] });
    },
  });
  const remove = useMutation({
    mutationFn: (change: Slot) =>
      deleteMealPlanItem({ householdId: householdId!, mealPlanId: planQ.data!.id, ...change }),
    onSuccess: async () => {
      setSlot(null);
      await qc.invalidateQueries({ queryKey: ['mealPlanItems', householdId, weekStart] });
    },
  });
  if (!ready) return <HouseholdGate />;
  const recipes = recipesQ.data ?? [];
  const items = itemsQ.data ?? [];
  const busy = save.isPending || remove.isPending;
  const error = recipesQ.error || planQ.error || itemsQ.error;
  const pick = (next: Slot) => {
    save.reset();
    remove.reset();
    setSearch('');
    setShowAll(false);
    setSlot(next);
  };
  const selectedRecipes = recipes.filter(
    (r) =>
      (showAll || !slot || r.tags.includes(slot.mealType)) &&
      r.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );
  const loading = recipesQ.isLoading || planQ.isLoading || (!!planQ.data && itemsQ.isLoading);
  return (
    <>
      <div className="page-heading plan-heading">
        <div>
          <h1>Nedeljni plan obroka</h1>
          <p>Malo planiranja, mirnija nedelja.</p>
        </div>
        <Link className="button button-secondary" to={`/shopping?week=${weekStart}`}>
          <ShoppingBasket size={17} />
          <span>Kupovina</span>
        </Link>
      </div>
      <div className="plan-toolbar">
        <div className="week-control">
          <button
            aria-label="Prethodna nedelja"
            onClick={() => setParams({ week: addDaysISO(weekStart, -7) })}
            disabled={busy}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="today-button"
            onClick={() => setParams({ week: currentWeek })}
            disabled={busy}
          >
            Danas
          </button>
          <button
            aria-label="Sledeća nedelja"
            onClick={() => setParams({ week: addDaysISO(weekStart, 7) })}
            disabled={busy}
          >
            <ChevronRight size={17} />
          </button>
          <span>{weekLabel(weekStart)}</span>
        </div>
        <span className="muted text-xs">
          {busy ? 'Čuvanje…' : 'Promene obroka čuvaju se automatski.'}
        </span>
      </div>
      <ErrorNotice
        error={error}
        retry={() => {
          void recipesQ.refetch();
          void planQ.refetch();
          if (planQ.data) void itemsQ.refetch();
        }}
      />
      <ErrorNotice error={save.error || remove.error} />
      {loading ? (
        <Loading />
      ) : (
        !error && (
          <>
            <div className="plan-progress">
              <Check size={17} />
              <span>
                Isplanirano <strong>{items.length} od 21 obroka</strong>
              </span>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Popunjenost plana"
                aria-valuemin={0}
                aria-valuemax={21}
                aria-valuenow={items.length}
              >
                <div className="progress-fill" style={{ width: `${(items.length / 21) * 100}%` }} />
              </div>
            </div>
            <div className="week-grid">
              {Array.from({ length: 7 }, (_, index) => {
                const date = addDaysISO(weekStart, index);
                const count = items.filter((x) => x.date === date).length;
                return (
                  <section
                    key={date}
                    className="day-column"
                    aria-label={formatDate(date, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  >
                    <div className={`day-heading ${date === todayISO() ? 'today' : ''}`}>
                      <div>
                        <div className="section-label">
                          <span className="weekday-short">
                            {formatDate(date, { weekday: 'short' })}
                          </span>
                          <span className="weekday-long">
                            {formatDate(date, { weekday: 'long' })}
                          </span>
                          {date === todayISO() && ' · Danas'}
                        </div>
                        <strong>{formatDate(date)}</strong>
                      </div>
                      <span className="badge">{count}/3</span>
                    </div>
                    {MEALS.map((meal) => {
                      const item = items.find((x) => x.date === date && x.meal_type === meal.key);
                      const recipe = recipes.find((x) => x.id === item?.recipe_id);
                      return item ? (
                        <div className="meal-slot" key={meal.key}>
                          <div className="meal-title">
                            <span className="section-label">{meal.label}</span>
                            <button
                              className="icon-button"
                              aria-label={`Ukloni ${meal.label.toLowerCase()} za ${formatDate(date)}`}
                              disabled={busy}
                              onClick={() => remove.mutate({ date, mealType: meal.key })}
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <button
                            className="meal-name text-left"
                            onClick={() => pick({ date, mealType: meal.key })}
                            disabled={busy}
                            aria-label={`Zameni recept: ${recipe?.name ?? 'obrok'}`}
                          >
                            {recipe?.name ?? 'Recept nije dostupan'}
                          </button>
                          <div className="meal-bottom">
                            <span className="muted text-xs">
                              {recipe && totalMinutes(recipe) > 0
                                ? `${totalMinutes(recipe)} min`
                                : ''}
                            </span>
                            <div className="stepper">
                              <button
                                className="icon-button"
                                aria-label={`Smanji porcije za ${recipe?.name}`}
                                disabled={busy || item.servings <= 1}
                                onClick={() =>
                                  save.mutate({
                                    date,
                                    mealType: meal.key,
                                    recipeId: item.recipe_id,
                                    servings: item.servings - 1,
                                  })
                                }
                              >
                                <Minus size={13} />
                              </button>
                              <span>{item.servings} por.</span>
                              <button
                                className="icon-button"
                                aria-label={`Povećaj porcije za ${recipe?.name}`}
                                disabled={busy || item.servings >= 100}
                                onClick={() =>
                                  save.mutate({
                                    date,
                                    mealType: meal.key,
                                    recipeId: item.recipe_id,
                                    servings: item.servings + 1,
                                  })
                                }
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="meal-slot empty w-full"
                          key={meal.key}
                          disabled={busy}
                          onClick={() => pick({ date, mealType: meal.key })}
                        >
                          <Plus size={21} />
                          <span>
                            Dodaj{' '}
                            {meal.key === 'dinner' ? 'večeru' : meal.label.toLocaleLowerCase()}
                          </span>
                        </button>
                      );
                    })}
                  </section>
                );
              })}
            </div>
            <div className="panel plan-summary">
              <div>
                <h2>Od plana do liste za kupovinu</h2>
                <p>Izračunaj potrebne količine za ovu nedelju, uz postojeće zalihe.</p>
              </div>
              <Button onClick={() => nav(`/shopping?week=${weekStart}&from=plan`)}>
                <ShoppingBasket size={18} />
                Pripremi kupovinu
              </Button>
            </div>
          </>
        )
      )}
      {slot && (
        <Dialog
          title={`Izaberi recept · ${MEALS.find((x) => x.key === slot.mealType)?.label}`}
          onClose={() => {
            if (!busy) setSlot(null);
          }}
        >
          <p className="muted text-sm mb-4">
            {formatDate(slot.date, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="search-field">
            <Search size={18} />
            <Input
              type="search"
              aria-label="Pretraži recepte"
              placeholder="Pretraži recepte…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="flex gap-2 items-center my-4">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Prikaži i recepte za druge obroke
          </label>
          <ErrorNotice error={save.error || remove.error} />
          {selectedRecipes.map((recipe) => (
            <button
              className="picker-row"
              key={recipe.id}
              disabled={busy}
              onClick={() =>
                save.mutate({ ...slot, recipeId: recipe.id, servings: recipe.default_servings })
              }
            >
              <div className="grow flex-1">
                <h3>{recipe.name}</h3>
                <p className="flex items-center gap-2">
                  <Clock3 size={13} />
                  {totalMinutes(recipe) ? `${totalMinutes(recipe)} min · ` : ''}
                  {recipe.default_servings} porcije
                </p>
              </div>
              <span className="badge">{save.isPending ? 'Čuvam…' : 'Izaberi'}</span>
            </button>
          ))}
          {!selectedRecipes.length && (
            <p className="muted py-6">
              Nema odgovarajućih recepata.{' '}
              <Link className="text-link" to="/recipes/new">
                Dodaj novi recept
              </Link>{' '}
              ili prikaži sve obroke.
            </p>
          )}
          {items.some((item) => item.date === slot.date && item.meal_type === slot.mealType) && (
            <div className="dialog-footer">
              <Button variant="danger" disabled={busy} onClick={() => remove.mutate(slot)}>
                <X size={17} />
                Ukloni obrok iz plana
              </Button>
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
