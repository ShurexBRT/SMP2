-- SMP-9: checkbox and inventory credit/debit commit in the same transaction.
-- Old checked rows are deliberately not credited retrospectively.
alter table public.shopping_list_items add column inventory_transferred_at timestamptz;

create table private.shopping_inventory_receipts (
  shopping_item_id uuid primary key,
  household_id uuid not null,
  ingredient_id uuid not null,
  qty numeric not null check (qty > 0),
  unit text not null,
  foreign key (shopping_item_id)
    references public.shopping_list_items(id) on delete cascade
    deferrable initially deferred
);
alter table private.shopping_inventory_receipts enable row level security;
revoke all on private.shopping_inventory_receipts from public, anon, authenticated, service_role;

create function private.stock_convert_quantity(amount numeric, from_unit text, to_unit text)
returns numeric language plpgsql immutable set search_path = '' as $$
declare src text := lower(trim(from_unit)); dst text := lower(trim(to_unit));
  src_factor numeric := 1; dst_factor numeric := 1;
begin
  if src='kg' then src:='g'; src_factor:=1000;
  elsif src='l' then src:='ml'; src_factor:=1000;
  elsif src in ('komad','komada') then src:='kom'; end if;
  if dst='kg' then dst:='g'; dst_factor:=1000;
  elsif dst='l' then dst:='ml'; dst_factor:=1000;
  elsif dst in ('komad','komada') then dst:='kom'; end if;
  if src is null or src='' or dst is null or dst='' or src<>dst then
    raise exception 'Jedinice % i % nisu kompatibilne. Proveri stavku u frižideru.', from_unit, to_unit
      using errcode='22023';
  end if;
  return amount * src_factor / dst_factor;
end $$;
revoke all on function private.stock_convert_quantity(numeric,text,text) from public, anon, authenticated, service_role;

create function private.sync_shopping_inventory()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stock public.inventory_items%rowtype;
  receipt private.shopping_inventory_receipts%rowtype;
  amount numeric;
  was_checked boolean := false;
begin
  -- Clients cannot forge the persisted reconciliation marker.
  if tg_op='UPDATE' then
    new.inventory_transferred_at := old.inventory_transferred_at;
    was_checked := old.checked;
    if old.inventory_transferred_at is not null and
      (new.id is distinct from old.id or new.household_id is distinct from old.household_id
       or new.shopping_list_id is distinct from old.shopping_list_id
       or new.ingredient_id is distinct from old.ingredient_id or new.qty is distinct from old.qty
       or new.unit is distinct from old.unit) then
      raise exception 'Prvo vrati kupljenu stavku na listu pre izmene količine ili namirnice.';
    end if;
  else
    new.inventory_transferred_at := null;
  end if;
  if new.checked=was_checked then return new; end if;
  if auth.uid() is null or not private.is_household_member(new.household_id,auth.uid()) then
    raise exception 'Household membership required' using errcode='42501';
  end if;

  if new.checked then
    if new.qty is null or new.qty<=0 or new.qty::text in ('NaN','Infinity','-Infinity')
      or new.unit is null or length(trim(new.unit))=0 then
      raise exception 'Unesi kupljenu količinu i jedinicu mere.' using errcode='22023';
    end if;
    if new.ingredient_id is null then
      perform pg_advisory_xact_lock(hashtextextended('smp-food:'||new.household_id::text||':'||lower(trim(new.label)),0));
      select id into new.ingredient_id from public.ingredients
        where household_id=new.household_id and lower(trim(name))=lower(trim(new.label))
        order by id limit 1;
      if new.ingredient_id is null then
        insert into public.ingredients(household_id,name,default_unit)
          values(new.household_id,trim(new.label),trim(new.unit)) returning id into new.ingredient_id;
      end if;
    elsif not exists(select 1 from public.ingredients where id=new.ingredient_id and household_id=new.household_id) then
      raise exception 'Ingredient is outside household' using errcode='42501';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('smp-stock:'||new.household_id::text||':'||new.ingredient_id::text,0));
    insert into public.inventory_items(household_id,ingredient_id,qty,unit)
      values(new.household_id,new.ingredient_id,0,trim(new.unit))
      on conflict(household_id,ingredient_id) do nothing;
    select * into strict stock from public.inventory_items
      where household_id=new.household_id and ingredient_id=new.ingredient_id for update;
    if stock.qty::text in ('NaN','Infinity','-Infinity') then
      raise exception 'Proveri količinu postojeće zalihe u frižideru.';
    end if;
    if stock.qty>0 and stock.expires_at<current_date then
      raise exception 'Zaliha ove namirnice ima istekao rok. Prvo je proveri u frižideru.';
    end if;
    amount := private.stock_convert_quantity(new.qty,new.unit,stock.unit);
    update public.inventory_items set qty=qty+amount,
      expires_at=case when qty=0 and expires_at<current_date then null else expires_at end
      where id=stock.id and household_id=new.household_id;
    insert into private.shopping_inventory_receipts(shopping_item_id,household_id,ingredient_id,qty,unit)
      values(new.id,new.household_id,new.ingredient_id,amount,stock.unit);
    new.inventory_transferred_at := statement_timestamp();
  else
    select * into receipt from private.shopping_inventory_receipts
      where shopping_item_id=new.id and household_id=new.household_id for update;
    if found then
      perform pg_advisory_xact_lock(hashtextextended('smp-stock:'||new.household_id::text||':'||receipt.ingredient_id::text,0));
      select * into stock from public.inventory_items where household_id=new.household_id
        and ingredient_id=receipt.ingredient_id for update;
      if not found then raise exception 'Zaliha je uklonjena. Kupovina ne može automatski da se poništi.'; end if;
      if stock.qty::text in ('NaN','Infinity','-Infinity') then
        raise exception 'Proveri količinu postojeće zalihe u frižideru.';
      end if;
      amount := private.stock_convert_quantity(receipt.qty,receipt.unit,stock.unit);
      if stock.qty<amount then
        raise exception 'Zaliha je već potrošena ili smanjena. Kupovina ne može automatski da se poništi.';
      end if;
      update public.inventory_items set qty=qty-amount where id=stock.id and household_id=new.household_id;
      delete from private.shopping_inventory_receipts where shopping_item_id=new.id;
    end if;
    new.inventory_transferred_at := null;
  end if;
  return new;
end $$;
revoke all on function private.sync_shopping_inventory() from public, anon, authenticated, service_role;
create trigger sync_shopping_inventory before insert or update on public.shopping_list_items
  for each row execute function private.sync_shopping_inventory();
