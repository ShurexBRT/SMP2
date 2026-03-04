import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequireHousehold } from "@/features/household/guard";
import { startOfWeekISO } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { addManualShoppingItem, getOrCreateShoppingList, listShoppingItems, toggleShoppingItem } from "@/features/shopping/api";
import { generateShoppingFromWeek } from "@/features/shopping/generateFromPlan";

export function ShoppingPage() {
  const qc = useQueryClient();
  const { householdId, ready } = useRequireHousehold();
  const [weekStart, setWeekStart] = React.useState(() => startOfWeekISO(new Date()));

  const [manualLabel, setManualLabel] = React.useState("");

  const listQ = useQuery({
    queryKey: ["shoppingList", householdId, weekStart],
    queryFn: () => getOrCreateShoppingList({ householdId: householdId!, weekStart }),
    enabled: ready,
  });

  const itemsQ = useQuery({
    queryKey: ["shoppingItems", householdId, weekStart],
    queryFn: () => listShoppingItems({ householdId: householdId!, shoppingListId: listQ.data!.id }),
    enabled: ready && !!listQ.data?.id,
  });

  const genMut = useMutation({
    mutationFn: (overwrite: boolean) =>
      generateShoppingFromWeek({ householdId: householdId!, weekStart, overwrite }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["shoppingItems", householdId, weekStart] });
    },
  });

  const toggleMut = useMutation({
    mutationFn: toggleShoppingItem,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["shoppingItems", householdId, weekStart] });
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!manualLabel.trim()) return;
      await addManualShoppingItem({
        householdId: householdId!,
        shoppingListId: listQ.data!.id,
        label: manualLabel.trim(),
      });
    },
    onSuccess: async () => {
      setManualLabel("");
      await qc.invalidateQueries({ queryKey: ["shoppingItems", householdId, weekStart] });
    },
  });

  if (!ready) {
    return (
      <Card>
        <CardHeader><CardTitle>Kupovina</CardTitle></CardHeader>
        <CardContent className="text-sm text-neutral-600">Prvo napravi household u Nalog.</CardContent>
      </Card>
    );
  }

  const items = itemsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Lista za kupovinu</h2>
          <div className="text-sm text-neutral-500">Shared lista za vas dvoje (household sync).</div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setWeekStart(shiftWeek(weekStart, -7))}>←</Button>
          <div className="text-sm text-neutral-600">Nedelja: <span className="font-medium">{weekStart}</span></div>
          <Button variant="secondary" onClick={() => setWeekStart(shiftWeek(weekStart, 7))}>→</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Generisanje</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button onClick={() => genMut.mutate(false)} disabled={genMut.isPending}>
            {genMut.isPending ? "Radim…" : "Dodaj iz plana (append)"}
          </Button>
          <Button variant="secondary" onClick={() => genMut.mutate(true)} disabled={genMut.isPending}>
            {genMut.isPending ? "Radim…" : "Regeneriši iz plana (overwrite)"}
          </Button>
          {genMut.isSuccess && (
            <div className="text-sm text-emerald-700">
              Ubacio: {genMut.data.inserted} stavki
            </div>
          )}
          {genMut.isError && (
            <div className="text-sm text-red-600">Greška: {(genMut.error as any)?.message}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ručno dodavanje</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input value={manualLabel} onChange={(e) => setManualLabel(e.target.value)} placeholder="npr. Kafa" />
          <Button onClick={() => addMut.mutate()} disabled={addMut.isPending || !manualLabel.trim()}>
            {addMut.isPending ? "Dodajem…" : "Dodaj"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Stavke</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(itemsQ.isLoading || listQ.isLoading) && <div className="text-sm text-neutral-500">Učitavanje…</div>}
          {(itemsQ.isError || listQ.isError) && (
            <div className="text-sm text-red-600">
              Greška: {(itemsQ.error as any)?.message || (listQ.error as any)?.message}
            </div>
          )}

          {!itemsQ.isLoading && items.length === 0 && (
            <div className="text-sm text-neutral-600">Lista je prazna. Generiši iz plana ili dodaj ručno.</div>
          )}

          {items.map((it) => (
            <label key={it.id} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 px-3 py-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!it.checked}
                  onChange={(e) =>
                    toggleMut.mutate({ householdId: householdId!, id: it.id, checked: e.target.checked })
                  }
                />
                <div className={it.checked ? "text-neutral-400 line-through" : ""}>
                  <div className="text-sm font-medium">{it.label}</div>
                  <div className="text-xs text-neutral-500">
                    {it.qty ?? "—"} {it.unit ?? ""} • {it.source}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function shiftWeek(weekStart: string, days: number) {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}