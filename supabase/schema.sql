-- Smart Meal Planner v2 schema (household-shared data model)
-- Run this in Supabase SQL editor.

create extension if not exists "pgcrypto";

-- =========================
-- HOUSEHOLDS
-- =========================
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  role text not null check (role in ('owner','member')) default 'member',
  status text not null check (status in ('invited','active')) default 'invited',
  created_at timestamptz not null default now(),
  unique (household_id, email)
);

create index if not exists household_members_email_idx on public.household_members (email);
create index if not exists household_members_user_idx on public.household_members (user_id);

-- helper: check if current user is active member of household
create or replace function public.is_household_member(hh uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    join auth.users u on u.id = auth.uid()
    where hm.household_id = hh
      and hm.status = 'active'
      and hm.email = u.email
  );
$$;

-- helper: check if current user is owner
create or replace function public.is_household_owner(hh uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    join auth.users u on u.id = auth.uid()
    where hm.household_id = hh
      and hm.status = 'active'
      and hm.role = 'owner'
      and hm.email = u.email
  );
$$;

-- =========================
-- RECIPES
-- =========================
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  steps text[] not null default '{}',
  tags text[] not null default '{}',
  prep_minutes int,
  cook_minutes int,
  default_servings int not null default 2,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_household_idx on public.recipes (household_id);
create index if not exists recipes_updated_idx on public.recipes (updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_recipes_updated on public.recipes;
create trigger trg_recipes_updated
before update on public.recipes
for each row execute function public.set_updated_at();

-- =========================
-- INGREDIENTS
-- =========================
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  default_unit text not null default 'kom',
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  qty numeric not null default 1,
  unit text not null default 'kom',
  optional boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- =========================
-- MEAL PLAN
-- =========================
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  week_start date not null, -- ISO YYYY-MM-DD (Monday)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, week_start)
);

drop trigger if exists trg_meal_plans_updated on public.meal_plans;
create trigger trg_meal_plans_updated
before update on public.meal_plans
for each row execute function public.set_updated_at();

create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner')),
  recipe_id uuid not null references public.recipes (id) on delete restrict,
  servings int not null default 2,
  created_at timestamptz not null default now()
);

create index if not exists meal_plan_items_plan_idx on public.meal_plan_items (meal_plan_id);

-- =========================
-- INVENTORY
-- =========================
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  qty numeric not null default 0,
  unit text not null default 'kom',
  min_qty numeric,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, ingredient_id)
);

drop trigger if exists trg_inventory_updated on public.inventory_items;
create trigger trg_inventory_updated
before update on public.inventory_items
for each row execute function public.set_updated_at();

-- =========================
-- SHOPPING
-- =========================
create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  week_start date not null,
  status text not null check (status in ('open','archived')) default 'open',
  created_at timestamptz not null default now(),
  unique (household_id, week_start)
);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  shopping_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  ingredient_id uuid references public.ingredients (id) on delete set null,
  label text not null,
  qty numeric,
  unit text,
  category text not null default 'ostalo',
  checked boolean not null default false,
  source text not null check (source in ('plan','manual')) default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_list_idx on public.shopping_list_items (shopping_list_id);
create index if not exists shopping_items_checked_idx on public.shopping_list_items (checked);

-- =========================
-- RLS
-- =========================
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;

-- Households: select for members
drop policy if exists households_select on public.households;
create policy households_select on public.households
for select
using (public.is_household_member(id));

-- Households: insert only for authenticated user (creator)
drop policy if exists households_insert on public.households;
create policy households_insert on public.households
for insert
with check (auth.uid() = created_by);

-- Households: update only owner
drop policy if exists households_update on public.households;
create policy households_update on public.households
for update
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

-- Members: select only within household and for members
drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members
for select
using (public.is_household_member(household_id));

-- Members: insert only owner (used by Edge Function or owner flow)
drop policy if exists members_insert on public.household_members;
create policy members_insert on public.household_members
for insert
with check (public.is_household_owner(household_id));

-- Members: update only owner (activate, assign user_id)
drop policy if exists members_update on public.household_members;
create policy members_update on public.household_members
for update
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

-- Generic policies for household-scoped tables
-- Select: member can read
-- Insert/Update/Delete: member can write (shared household)
-- If you want stricter write perms later, we can tighten.

do $$
declare
  t text;
begin
  foreach t in array ['recipes','ingredients','recipe_ingredients','meal_plans','meal_plan_items','inventory_items','shopping_lists','shopping_list_items']
  loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format('create policy %I_select on public.%I for select using (public.is_household_member(household_id));', t, t);

    execute format('drop policy if exists %I_insert on public.%I;', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (public.is_household_member(household_id));', t, t);

    execute format('drop policy if exists %I_update on public.%I;', t, t);
    execute format('create policy %I_update on public.%I for update using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));', t, t);

    execute format('drop policy if exists %I_delete on public.%I;', t, t);
    execute format('create policy %I_delete on public.%I for delete using (public.is_household_member(household_id));', t, t);
  end loop;
end $$;
