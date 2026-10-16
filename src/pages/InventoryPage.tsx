import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Refrigerator, Plus, Search, Pencil, Trash2, PackageCheck } from 'lucide-react';
import {
  listInventory,
  saveInventoryItem,
  deleteInventoryItem,
  type InventoryItem,
} from '@/features/inventory/api';
import { useRequireHousehold } from '@/features/household/guard';
import { formatQty, parseQuantity } from '@/lib/data';
import { todayISO, formatDate, normalizeName } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorNotice, HouseholdGate, Loading } from '@/components/ui/Feedback';

export function InventoryPage() {
  const qc = useQueryClient();
  const { householdId, ready } = useRequireHousehold();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('kom');
  const [minimum, setMinimum] = useState('');
  const [expires, setExpires] = useState('');
  const q = useQuery({
    queryKey: ['inventory', householdId],
    queryFn: () => listInventory(householdId!),
    enabled: ready,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['inventory', householdId] });
  const save = useMutation({
    mutationFn: () =>
      saveInventoryItem({
        householdId: householdId!,
        id: editing && editing !== 'new' ? editing.id : undefined,
        name,
        qty: parseQuantity(qty),
        unit: unit.trim(),
        minQty: minimum.trim() ? parseQuantity(minimum, 'Minimalna zaliha') : null,
        expiresAt: expires || null,
      }),
    onSuccess: () => setEditing(null),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(householdId!, id),
    onSettled: refresh,
  });
  const open = (item: InventoryItem | 'new') => {
    save.reset();
    setEditing(item);
    setName(item === 'new' ? '' : (item.ingredients?.name ?? ''));
    setQty(item === 'new' ? '1' : String(item.qty));
    setUnit(item === 'new' ? 'kom' : item.unit);
    setMinimum(item === 'new' || item.min_qty == null ? '' : String(item.min_qty));
    setExpires(item === 'new' ? '' : (item.expires_at ?? ''));
  };
  if (!ready) return <HouseholdGate />;
  const all = q.data ?? [];
  const isLow = (x: InventoryItem) =>
    x.qty === 0 ||
    (x.min_qty != null && x.qty < x.min_qty) ||
    (!!x.expires_at && x.expires_at < todayISO());
  const filtered = all.filter((x) =>
    normalizeName(x.ingredients?.name ?? '').includes(normalizeName(search))
  );
  const low = filtered.filter(isLow),
    available = filtered.filter((x) => !isLow(x));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Šta imamo u frižideru?</h1>
          <p>Namirnice i zalihe vašeg domaćinstva.</p>
        </div>
        <Button onClick={() => open('new')}>
          <Plus size={18} />
          Dodaj
        </Button>
      </div>
      <div className="page-stack">
        <div className="inventory-status">
          <Refrigerator size={32} className="brand-icon" />
          <div>
            <h2>
              {all.length ? `${all.length} namirnica u zalihama` : 'Dobar plan počinje zalihama'}
            </h2>
            <p>
              {all.filter(isLow).length
                ? `${all.filter(isLow).length} namirnica treba proveriti ili dopuniti.`
                : 'Dodaj ono što već imaš da kupovina bude preciznija.'}
            </p>
          </div>
        </div>
        <div className="search-field">
          <Search size={18} />
          <Input
            type="search"
            aria-label="Pretraži zalihe"
            placeholder="Pretraži namirnice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ErrorNotice error={q.error} retry={() => void q.refetch()} />
        <ErrorNotice error={remove.error} />
        {q.isLoading ? (
          <Loading />
        ) : (
          !q.error &&
          (!filtered.length ? (
            <EmptyState
              icon={<PackageCheck size={29} />}
              title={search ? 'Nema rezultata' : 'Dodaj prve namirnice'}
            >
              {search ? 'Probaj drugi naziv namirnice.' : 'Unesi količine koje već imaš kod kuće.'}
            </EmptyState>
          ) : (
            [
              { title: 'Za proveru i dopunu', rows: low, low: true },
              { title: 'Na stanju', rows: available, low: false },
            ].map(
              (group) =>
                !!group.rows.length && (
                  <section key={group.title}>
                    <h2 className="text-base mb-4">
                      {group.title} <span className="badge ml-2">{group.rows.length}</span>
                    </h2>
                    <div className="inventory-grid">
                      {group.rows.map((item) => (
                        <div className={`list-row ${group.low ? 'stock-low' : ''}`} key={item.id}>
                          <div className="stock-icon">
                            <Refrigerator size={19} />
                          </div>
                          <div className="grow">
                            <h3>{item.ingredients?.name ?? 'Namirnica'}</h3>
                            <p>
                              {formatQty(item.qty)} {item.unit}
                              {item.min_qty != null &&
                                ` · minimum ${formatQty(item.min_qty)} ${item.unit}`}
                            </p>
                            {item.expires_at && (
                              <p
                                style={{
                                  color: item.expires_at < todayISO() ? 'var(--danger)' : undefined,
                                }}
                              >
                                Rok: {formatDate(item.expires_at)}
                              </p>
                            )}
                          </div>
                          <button
                            className="icon-button"
                            aria-label={`Izmeni ${item.ingredients?.name}`}
                            onClick={() => open(item)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Obriši ${item.ingredients?.name}`}
                            disabled={remove.isPending}
                            onClick={() => {
                              if (confirm(`Ukloniti „${item.ingredients?.name}“ iz zaliha?`))
                                remove.mutate(item.id);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )
            )
          ))
        )}
      </div>
      {editing && (
        <Dialog
          title={editing === 'new' ? 'Dodaj namirnicu' : 'Izmeni zalihu'}
          onClose={() => {
            if (!save.isPending) setEditing(null);
          }}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <label>
              Naziv namirnice
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={editing !== 'new'}
                autoComplete="off"
                placeholder="npr. Pirinač"
              />
            </label>
            <div className="form-grid">
              <label>
                Količina
                <Input
                  required
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </label>
              <label>
                Jedinica
                <select className="field" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {Array.from(new Set(['kom', 'g', 'kg', 'ml', 'l', unit])).map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Minimum
                <Input
                  inputMode="decimal"
                  placeholder="Opciono"
                  value={minimum}
                  onChange={(e) => setMinimum(e.target.value)}
                />
              </label>
            </div>
            <label>
              Rok trajanja (opciono)
              <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </label>
            {editing === 'new' && (
              <p className="muted text-xs">
                Ako namirnica već postoji, količine se sabiraju u postojećoj jedinici. Čuvamo
                najraniji uneti rok; uneti minimum važi za ukupnu zalihu.
              </p>
            )}
            <ErrorNotice error={save.error} />
            <div className="dialog-footer">
              <Button
                type="button"
                variant="secondary"
                disabled={save.isPending}
                onClick={() => setEditing(null)}
              >
                Otkaži
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Čuvam…' : 'Sačuvaj'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
