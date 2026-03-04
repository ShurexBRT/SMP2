import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequireHousehold } from "@/features/household/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";

type Item = {
  id: string;
  ingredient_id: string;
  qty: number;
  unit: string;
  min_qty: number | null;
  ingredients?: { name: string } | null;
};

export function InventoryPage() {
  const qc = useQueryClient();
  const { householdId, ready } = useRequireHousehold();

  const [name, setName] = React.useState("");
  const [qty, setQty] = React.useState("1");
  const [unit, setUnit] = React.useState("kom");
  const [minQty, setMinQty] = React.useState("");

  const q = useQuery({
    queryKey: ["inventory", householdId],
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, ingredients(name)")
        .eq("household_id", householdId!)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as any;
    },
    enabled: ready,
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Naziv je obavezan");

      // Create/find ingredient first
      const { data: ing, error: ingErr } = await supabase
        .from("ingredients")
        .select("*")
        .eq("household_id", householdId!)
        .ilike("name", name.trim())
        .maybeSingle();

      if (ingErr) throw ingErr;

      let ingredientId = ing?.id as string | undefined;

      if (!ingredientId) {
        const { data: created, error: cErr } = await supabase
          .from("ingredients")
          .insert({ household_id: householdId!, name: name.trim(), default_unit: unit.trim() })
          .select("*")
          .single();
        if (cErr) throw cErr;
        ingredientId = created.id;
      }

      const { error } = await supabase.from("inventory_items").insert({
        household_id: householdId!,
        ingredient_id: ingredientId,
        qty: Number(qty || 1),
        unit: unit.trim(),
        min_qty: minQty.trim() ? Number(minQty) : null,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      setName("");
      setQty("1");
      setUnit("kom");
      setMinQty("");
      await qc.invalidateQueries({ queryKey: ["inventory", householdId] });
    },
  });

  if (!ready) {
    return (
      <Card>
        <CardHeader><CardTitle>Frižider</CardTitle></CardHeader>
        <CardContent className="text-sm text-neutral-600">Prvo napravi household u Nalog.</CardContent>
      </Card>
    );
  }

  const items = q.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Frižider</h2>
        <div className="text-sm text-neutral-500">Stanje namirnica. Sledeće: “add from shopping”.</div>
      </div>

      <Card>
        <CardHeader><CardTitle>Dodaj</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="npr. Jaja" />
          <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" placeholder="qty" />
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kom / g / ml" />
          <Input value={minQty} onChange={(e) => setMinQty(e.target.value)} inputMode="numeric" placeholder="min (opciono)" />

          <div className="md:col-span-4">
            {addMut.isError && <div className="text-sm text-red-600">Greška: {(addMut.error as any)?.message}</div>}
            <Button onClick={() => addMut.mutate()} disabled={addMut.isPending || !name.trim()}>
              {addMut.isPending ? "Dodajem…" : "Dodaj u frižider"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Stavke</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {q.isLoading && <div className="text-sm text-neutral-500">Učitavanje…</div>}
          {q.isError && <div className="text-sm text-red-600">Greška: {(q.error as any)?.message}</div>}

          {!q.isLoading && items.length === 0 && (
            <div className="text-sm text-neutral-600">Prazno. Dodaj prvu namirnicu.</div>
          )}

          {items.map((it) => {
            const low = it.min_qty != null && it.qty < it.min_qty;
            return (
              <div key={it.id} className={`rounded-2xl border px-3 py-2 ${low ? "border-red-300 bg-red-50" : "border-neutral-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{it.ingredients?.name ?? "—"}</div>
                  <div className="text-sm">{it.qty} {it.unit}</div>
                </div>
                {it.min_qty != null && (
                  <div className="text-xs text-neutral-500">Min: {it.min_qty}</div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}