import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Clock3, UsersRound, BookOpen, ArrowRight } from 'lucide-react';
import { useRequireHousehold } from '@/features/household/guard';
import { listRecipes } from '@/features/recipes/api';
import { supabase } from '@/lib/supabase';
import { MEALS, totalMinutes } from '@/lib/data';
import { normalizeName } from '@/lib/utils';
import { allRows } from '@/lib/paginate';
import { Input } from '@/components/ui/Input';
import { EmptyState, ErrorNotice, HouseholdGate, Loading } from '@/components/ui/Feedback';

export function RecipesPage() {
  const { householdId, ready } = useRequireHousehold();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const q = useQuery({
    queryKey: ['recipes', householdId],
    queryFn: () => listRecipes(householdId!),
    enabled: ready,
  });
  const ingredientsQ = useQuery({
    queryKey: ['recipeSearchIngredients', householdId],
    enabled: ready,
    queryFn: async () => {
      const rows = await allRows(
        async (from, to) =>
          await supabase
            .from('recipe_ingredients')
            .select('recipe_id, ingredients(name)')
            .eq('household_id', householdId!)
            .order('id')
            .range(from, to)
      );
      return rows as unknown as { recipe_id: string; ingredients: { name: string } | null }[];
    },
  });
  if (!ready) return <HouseholdGate />;
  const recipes = q.data ?? [];
  const query = normalizeName(search);
  const filtered = recipes.filter((r) => {
    const mealMatch =
      filter === 'all' ||
      (filter === 'quick' ? totalMinutes(r) > 0 && totalMinutes(r) <= 30 : r.tags.includes(filter));
    const matchingIngredients =
      ingredientsQ.data
        ?.filter((x) => x.recipe_id === r.id)
        .map((x) => x.ingredients?.name ?? '')
        .join(' ') ?? '';
    return (
      mealMatch &&
      normalizeName([r.name, ...r.tags, r.notes ?? '', matchingIngredients].join(' ')).includes(
        query
      )
    );
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Moji recepti</h1>
          <p>
            {recipes.length
              ? `${recipes.length} recepata u zbirci domaćinstva`
              : 'Vaša zajednička knjiga recepata.'}
          </p>
        </div>
        <Link className="button button-primary" to="/recipes/new">
          <Plus size={18} />
          Novi recept
        </Link>
      </div>
      <div className="page-stack">
        <div className="search-field">
          <Search size={19} />
          <Input
            type="search"
            aria-label="Pretraži recepte po nazivu ili sastojku"
            placeholder="Pretraži recepte po nazivu ili sastojku…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="chips" aria-label="Filter recepata">
          {[{ key: 'all', label: 'Sve' }, ...MEALS, { key: 'quick', label: 'Do 30 min' }].map(
            (item) => (
              <button
                className="chip"
                key={item.key}
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
                {item.key === 'all' && <small>{recipes.length}</small>}
              </button>
            )
          )}
        </div>
        <ErrorNotice error={q.error} retry={() => void q.refetch()} />
        <ErrorNotice error={ingredientsQ.error} retry={() => void ingredientsQ.refetch()} />
        {q.isLoading ? (
          <Loading />
        ) : (
          !q.error &&
          (!filtered.length ? (
            <EmptyState
              icon={<BookOpen size={28} />}
              title={recipes.length ? 'Nema rezultata' : 'Prvi recept je početak'}
            >
              {recipes.length
                ? 'Probaj drugi naziv ili promeni filter.'
                : 'Sačuvaj omiljeno jelo, pa ga jednim dodirom dodaj u plan.'}
              {!recipes.length && (
                <Link to="/recipes/new" className="button button-primary mt-5">
                  <Plus size={17} />
                  Dodaj prvi recept
                </Link>
              )}
            </EmptyState>
          ) : (
            <div className="recipes-grid">
              {filtered.map((r) => (
                <Link to={`/recipes/${r.id}`} key={r.id} className="recipe-card">
                  <div className="flex flex-wrap gap-1.5">
                    {r.tags
                      .filter((t) => MEALS.some((m) => m.key === t))
                      .map((t) => (
                        <span className="badge" key={t}>
                          {MEALS.find((m) => m.key === t)?.label}
                        </span>
                      ))}
                    {totalMinutes(r) > 0 && (
                      <span className="badge">
                        <Clock3 size={12} />
                        {totalMinutes(r)} min
                      </span>
                    )}
                  </div>
                  <h2>{r.name}</h2>
                  <div className="recipe-meta">
                    <span>
                      <Clock3 size={15} />
                      {r.prep_minutes ?? 0} min priprema · {r.cook_minutes ?? 0} min kuvanje
                    </span>
                    <span>
                      <UsersRound size={15} />
                      {r.default_servings} porcije
                    </span>
                  </div>
                  {r.notes && <div className="recipe-note">{r.notes}</div>}
                  <div className="recipe-tags">
                    {r.tags
                      .filter((t) => !MEALS.some((m) => m.key === t))
                      .slice(0, 4)
                      .map((t) => (
                        <span key={t}>#{t}</span>
                      ))}
                    <ArrowRight className="ml-auto" size={18} />
                  </div>
                </Link>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}
