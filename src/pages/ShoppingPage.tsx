import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBasket,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { useRequireHousehold } from '@/features/household/guard';
import { addDaysISO, weekLabel, validWeek } from '@/lib/utils';
import { formatQty, parseQuantity } from '@/lib/data';
import type { Row } from '@/lib/data';
import {
  getShoppingList,
  getOrCreateShoppingList,
  addManualShoppingItem,
  listShoppingItems,
  toggleShoppingItem,
  deleteShoppingItem,
} from '@/features/shopping/api';
import { generateShoppingFromWeek } from '@/features/shopping/generateFromPlan';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorNotice, HouseholdGate, Loading } from '@/components/ui/Feedback';

export function ShoppingPage() {
  const qc = useQueryClient();
  const { householdId, ready } = useRequireHousehold();
  const [params, setParams] = useSearchParams();
  const rawWeek = params.get('week');
  const weekStart = validWeek(rawWeek);
  const [label, setLabel] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('kom');
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [purchasedInInventoryIds, setPurchasedInInventoryIds] = useState<string[]>([]);
  const [purchaseItem, setPurchaseItem] = useState<Row<'shopping_list_items'> | null>(null);
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseUnit, setPurchaseUnit] = useState('kom');
  const [purchaseError, setPurchaseError] = useState<unknown>(null);
  const [historyItem, setHistoryItem] = useState<Row<'shopping_list_items'> | null>(null);
  const listQ = useQuery({
    queryKey: ['shoppingList', householdId, weekStart],
    queryFn: () => getShoppingList({ householdId: householdId!, weekStart }),
    enabled: ready,
  });
  const itemsQ = useQuery({
    queryKey: ['shoppingItems', householdId, weekStart],
    queryFn: () => listShoppingItems({ householdId: householdId!, shoppingListId: listQ.data!.id }),
    enabled: ready && !!listQ.data,
  });
  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['shoppingList', householdId, weekStart] });
    await qc.invalidateQueries({ queryKey: ['shoppingItems', householdId, weekStart] });
    await qc.invalidateQueries({ queryKey: ['inventory', householdId] });
    await qc.invalidateQueries({ queryKey: ['ingredients', householdId] });
  };
  const gen = useMutation({
    mutationFn: () =>
      generateShoppingFromWeek({ householdId: householdId!, weekStart, purchasedInInventoryIds }),
    onSuccess: () => setConfirmRefresh(false),
    onSettled: invalidate,
  });
  const toggle = useMutation({
    mutationFn: toggleShoppingItem,
    onSuccess: () => {
      setPurchaseItem(null);
      setPurchaseError(null);
    },
    onSettled: invalidate,
  });
  const purchase = (item: Row<'shopping_list_items'>) => {
    if (item.qty == null || item.qty <= 0 || !item.unit?.trim()) {
      setPurchaseItem(item);
      setPurchaseQty(item.qty ? String(item.qty) : '');
      setPurchaseUnit(item.unit || 'kom');
      setPurchaseError(null);
      toggle.reset();
    } else toggle.mutate({ householdId: householdId!, id: item.id, checked: true });
  };
  const remove = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) =>
      deleteShoppingItem(householdId!, id, checked),
    onSuccess: () => setHistoryItem(null),
    onSettled: invalidate,
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!label.trim()) throw new Error('Unesi naziv stavke.');
      const amount = qty.trim() ? parseQuantity(qty, 'Količina', false) : null;
      const list = await getOrCreateShoppingList({ householdId: householdId!, weekStart });
      await addManualShoppingItem({
        householdId: householdId!,
        shoppingListId: list.id,
        label,
        qty: amount,
        unit: amount == null ? null : unit,
      });
    },
    onSuccess: () => {
      setLabel('');
      setQty('');
    },
    onSettled: invalidate,
  });
  if (!ready) return <HouseholdGate />;
  const items = itemsQ.data ?? [];
  const purchased = items.filter((x) => x.checked);
  const needed = items.filter((x) => !x.checked);
  const busy = gen.isPending || toggle.isPending || remove.isPending || add.isPending;
  const loading = listQ.isLoading || (!!listQ.data && itemsQ.isLoading);
  const queryError = listQ.error || itemsQ.error;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Lista za kupovinu</h1>
          <p>Sve što vam nedostaje, na jednom mestu.</p>
        </div>
        <span className="badge">
          <ShoppingBasket size={15} />
          {needed.length} stavki
        </span>
      </div>
      <div className="plan-toolbar">
        <div className="week-control">
          <button
            aria-label="Prethodna nedelja"
            disabled={busy}
            onClick={() => setParams({ week: addDaysISO(weekStart, -7) })}
          >
            <ChevronLeft size={17} />
          </button>
          <span>{weekLabel(weekStart)}</span>
          <button
            aria-label="Sledeća nedelja"
            disabled={busy}
            onClick={() => setParams({ week: addDaysISO(weekStart, 7) })}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <Link className="text-link text-xs" to={`/plan?week=${weekStart}`}>
          Pogledaj plan ove nedelje
        </Link>
      </div>
      <ErrorNotice
        error={queryError}
        retry={() => {
          void listQ.refetch();
          if (listQ.data) void itemsQ.refetch();
        }}
      />
      <ErrorNotice error={toggle.error || remove.error || add.error} />
      {gen.isSuccess && (
        <div role="status" className="notice mb-5">
          <Check size={18} />
          Lista je usklađena sa planom i zalihama. Ručne i kupljene stavke su sačuvane.
        </div>
      )}
      <div className="shopping-layout">
        <div className="page-stack">
          <form
            className="panel form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <div className="add-shopping">
              <Input
                aria-label="Naziv nove stavke"
                placeholder="Dodaj novu stavku…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <Button
                type="submit"
                aria-label="Dodaj u kupovinu"
                disabled={busy || !label.trim() || loading || !!queryError}
              >
                <Plus size={20} />
              </Button>
            </div>
            <details>
              <summary className="text-xs muted cursor-pointer">Dodaj količinu (opciono)</summary>
              <div className="form-grid mt-3">
                <label>
                  Količina
                  <Input
                    inputMode="decimal"
                    placeholder="npr. 500"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                </label>
                <label>
                  Jedinica
                  <select className="field" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {['kom', 'g', 'kg', 'ml', 'l'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              </div>
            </details>
          </form>
          {loading ? (
            <Loading />
          ) : (
            !queryError && (
              <>
                {!items.length ? (
                  <EmptyState
                    icon={<ShoppingBasket size={29} />}
                    title="Lista je spremna za prvi unos"
                  >
                    Dodaj stavku ručno ili pripremi kupovinu iz nedeljnog plana.
                  </EmptyState>
                ) : (
                  <>
                    <div className="section-toolbar">
                      <h2>
                        Potrebno za kupovinu <span className="badge ml-2">{needed.length}</span>
                      </h2>
                    </div>
                    <div className="shopping-list">
                      {needed.map((item) => (
                        <div className="list-row" key={item.id}>
                          <input
                            type="checkbox"
                            aria-label={`Označi kao kupljeno: ${item.label}`}
                            checked={false}
                            disabled={busy}
                            onChange={() => purchase(item)}
                          />
                          <div className="grow">
                            <h3>{item.label}</h3>
                            <p>
                              {formatQty(item.qty)} {item.unit ?? ''}
                            </p>
                          </div>
                          <span className="badge">
                            {item.source === 'plan' ? 'Iz plana' : 'Ručno'}
                          </span>
                          {item.source === 'manual' && (
                            <button
                              className="icon-button"
                              aria-label={`Obriši ${item.label}`}
                              disabled={busy}
                              onClick={() => {
                                if (confirm(`Obrisati „${item.label}“ sa liste?`))
                                  remove.mutate({ id: item.id, checked: false });
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {!needed.length && (
                      <div className="notice">
                        <Check size={18} />
                        Sve sa liste je kupljeno.
                      </div>
                    )}
                    {purchased.length > 0 && (
                      <details className="panel" open>
                        <summary className="cursor-pointer font-medium">
                          Kupljeno <span className="badge ml-2">{purchased.length}</span>
                        </summary>
                        <p className="muted text-xs mt-3">
                          Istorija kupovine ostaje i kada obrišeš zalihe ili obroke iz plana.
                          Brisanje stavke iz istorije ne menja količine u frižideru.
                        </p>
                        <div className="shopping-list mt-4">
                          {purchased.map((item) => (
                            <div key={item.id} className="list-row purchased">
                              <input
                                type="checkbox"
                                aria-label={`Vrati na listu: ${item.label}`}
                                checked
                                disabled={busy}
                                onChange={() =>
                                  toggle.mutate({
                                    householdId: householdId!,
                                    id: item.id,
                                    checked: false,
                                  })
                                }
                              />
                              <div className="grow">
                                <h3>{item.label}</h3>
                                <p>
                                  {formatQty(item.qty)} {item.unit}
                                </p>
                                {item.inventory_transferred_at && (
                                  <small>Preneto u zalihe pri kupovini</small>
                                )}
                              </div>
                              <button
                                className="icon-button"
                                aria-label={`Ukloni iz istorije: ${item.label}`}
                                title="Ukloni iz istorije kupovine"
                                disabled={busy}
                                onClick={() => {
                                  remove.reset();
                                  setHistoryItem(item);
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                )}
              </>
            )
          )}
        </div>
        <aside className="page-stack">
          <div className="panel form-stack">
            <div className="flex items-center gap-2">
              <CalendarDays size={20} className="brand-icon" />
              <h2 className="text-base">Kupovina iz plana</h2>
            </div>
            <p className="muted text-sm">
              Količine prate broj porcija. Oduzimamo dostupne zalihe i čuvamo već kupljeno.
            </p>
            <Button
              onClick={() => {
                gen.reset();
                setConfirmRefresh(true);
              }}
              disabled={busy || loading || !!queryError}
            >
              <RefreshCw size={16} />
              {gen.isPending ? 'Osvežavam…' : 'Osveži iz plana'}
            </Button>
          </div>
          {items.length > 0 && (
            <div className="summary-box">
              <div className="flex justify-between mb-3">
                <strong>
                  {purchased.length} od {items.length} kupljeno
                </strong>
                <Check size={18} />
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${(purchased.length / items.length) * 100}%` }}
                />
              </div>
              <p className="muted text-xs mt-3">Preostalo: {needed.length} stavki</p>
              <p className="muted text-xs mt-2">
                Kupljeno se dodaje u frižider i zalihe. Vraćanje na listu poništava taj unos dok
                količina nije potrošena.
              </p>
            </div>
          )}
        </aside>
      </div>
      {historyItem && (
        <Dialog
          title="Ukloni iz istorije kupovine"
          onClose={() => {
            if (!remove.isPending) setHistoryItem(null);
          }}
        >
          <p className="muted">
            Ukloniti „{historyItem.label}“ iz kupljenih stavki? Ova radnja ne menja frižider i
            zalihe. Ako namirnica i dalje treba za planirane obroke, ponovo će se pojaviti kada
            osvežiš listu iz plana.
          </p>
          <ErrorNotice error={remove.error} />
          <div className="dialog-footer">
            <Button
              variant="secondary"
              disabled={remove.isPending}
              onClick={() => setHistoryItem(null)}
            >
              Otkaži
            </Button>
            <Button
              disabled={remove.isPending}
              onClick={() => remove.mutate({ id: historyItem.id, checked: true })}
            >
              {remove.isPending ? 'Uklanjam…' : 'Ukloni iz istorije'}
            </Button>
          </div>
        </Dialog>
      )}
      {confirmRefresh && (
        <Dialog
          title="Uskladi kupovinu sa planom"
          onClose={() => {
            if (!gen.isPending) setConfirmRefresh(false);
          }}
        >
          <p className="muted">
            Lista za {weekLabel(weekStart)} biće ponovo izračunata. Ručne i kupljene stavke ostaju.
            Neobavezni sastojci se ne dodaju; rok zaliha se proverava prema datumu obroka.
          </p>
          {purchased.some((x) => x.source === 'plan' && !x.inventory_transferred_at) && (
            <div className="summary-box mt-4">
              <p className="text-sm mb-3">
                Ako ste nešto kupljeno već uneli u frižider, označite ga ovde da ne računamo istu
                količinu dvaput.
              </p>
              {purchased
                .filter((x) => x.source === 'plan' && !x.inventory_transferred_at)
                .map((item) => (
                  <label className="flex items-center gap-2 py-2" key={item.id}>
                    <input
                      type="checkbox"
                      disabled={gen.isPending}
                      checked={purchasedInInventoryIds.includes(item.id)}
                      onChange={(e) =>
                        setPurchasedInInventoryIds((prev) =>
                          e.target.checked ? [...prev, item.id] : prev.filter((x) => x !== item.id)
                        )
                      }
                    />
                    {item.label} je već u frižideru
                  </label>
                ))}
            </div>
          )}
          <ErrorNotice error={gen.error} />
          <div className="dialog-footer">
            <Button
              variant="secondary"
              disabled={gen.isPending}
              onClick={() => setConfirmRefresh(false)}
            >
              Otkaži
            </Button>
            <Button disabled={gen.isPending} onClick={() => gen.mutate()}>
              {gen.isPending ? 'Osvežavam…' : 'Osveži listu'}
            </Button>
          </div>
        </Dialog>
      )}
      {purchaseItem && (
        <Dialog
          title={`Kupljeno: ${purchaseItem.label}`}
          onClose={() => {
            if (!toggle.isPending) setPurchaseItem(null);
          }}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              setPurchaseError(null);
              try {
                const amount = parseQuantity(purchaseQty, 'Kupljena količina', false);
                toggle.mutate({
                  householdId: householdId!,
                  id: purchaseItem.id,
                  checked: true,
                  qty: amount,
                  unit: purchaseUnit,
                });
              } catch (error) {
                setPurchaseError(error);
              }
            }}
          >
            <p className="muted">Unesi koliko je kupljeno. Ta količina će biti dodata u zalihe.</p>
            <label>
              Količina
              <Input
                required
                inputMode="decimal"
                value={purchaseQty}
                onChange={(e) => setPurchaseQty(e.target.value)}
                disabled={toggle.isPending}
              />
            </label>
            <label>
              Jedinica
              <select
                className="field"
                value={purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value)}
                disabled={toggle.isPending}
              >
                {[...new Set(['kom', 'g', 'kg', 'ml', 'l', purchaseUnit])].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
            <ErrorNotice error={purchaseError || toggle.error} />
            <div className="dialog-footer">
              <Button
                type="button"
                variant="secondary"
                disabled={toggle.isPending}
                onClick={() => setPurchaseItem(null)}
              >
                Otkaži
              </Button>
              <Button type="submit" disabled={toggle.isPending}>
                {toggle.isPending ? 'Čuvam…' : 'Kupljeno — dodaj u zalihe'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
