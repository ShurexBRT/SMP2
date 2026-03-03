import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRequireHousehold } from "@/features/household/guard";
import { listRecipes } from "@/features/recipes/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MEAL_TAGS } from "@/features/recipes/schema";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

export function RecipesPage() {
  const { householdId, ready } = useRequireHousehold();

  const q = useQuery({
    queryKey: ["recipes", householdId],
    queryFn: () => listRecipes(householdId!),
    enabled: ready,
  });

  if (!ready) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recepti</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600">Idi na Nalog i napravi household.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Recepti</h2>
          <div className="text-sm text-neutral-500">Kreiraj, uređuj i koristi u planeru.</div>
        </div>
        <Link to="/recipes/new">
          <Button>+ Novi recept</Button>
        </Link>
      </div>

      {q.isLoading && <div className="text-sm text-neutral-500">Učitavanje…</div>}
      {q.isError && <div className="text-sm text-red-600">Greška: {(q.error as any)?.message}</div>}

      {!q.isLoading && (q.data?.length ?? 0) === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nema recepata</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-600">Ubaci prvi recept i posle je sve lagano.</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(q.data ?? []).map((r) => {
          const tags = r.tags ?? [];
          const mealBadges = (MEAL_TAGS as string[]).filter((m) => tags.includes(m));
          const otherTags = tags.filter((t) => !(MEAL_TAGS as string[]).includes(t));

          return (
            <Link key={r.id} to={`/recipes/${r.id}`}>
              <Card className="transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{r.name}</span>
                    <span className="text-xs text-neutral-500">{r.default_servings} por.</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-neutral-600 line-clamp-2">{r.steps?.[0] ?? "—"}</div>

                  <div className="flex flex-wrap gap-1">
                    {mealBadges.map((m) => (
                      <Badge key={m}>{MEAL_LABEL[m] ?? m}</Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {otherTags.slice(0, 6).map((t, i) => (
                      <Badge key={`${t}-${i}`}>{t}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}