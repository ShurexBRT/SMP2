-- Run as the SQL Editor administrator. All test writes are rolled back.
-- Requires one existing confirmed account; never prints its identity or email.
BEGIN;
DO $$
declare claims text;
begin
  select json_build_object('sub', id, 'email', email, 'role', 'authenticated')::text
    into claims from auth.users
    where email is not null and email_confirmed_at is not null
    order by created_at limit 1;
  if claims is null then raise exception 'No confirmed account available'; end if;
  perform set_config('smp.owner_claims', claims, true);
  perform set_config('request.jwt.claims', claims, true);
  perform set_config('smp.households_before', (select count(*)::text from public.households), true);
  perform set_config('smp.members_before', (select count(*)::text from public.household_members), true);
  if has_function_privilege('anon', 'public.create_household(text)', 'execute') then
    raise exception 'Anonymous RPC execution unexpectedly allowed';
  end if;
  if (select prosecdef from pg_proc where oid='public.create_household(text)'::regprocedure) then
    raise exception 'RPC must remain SECURITY INVOKER';
  end if;
end $$;

SET LOCAL ROLE authenticated;
DO $$
declare hh uuid; affected integer; original_claims text := current_setting('smp.owner_claims');
begin
  hh := public.create_household('  SMP rollback verification  ');
  perform set_config('smp.created_household', hh::text, true);
  if not exists(select 1 from public.households where id=hh and created_by=auth.uid()
    and name='SMP rollback verification') then raise exception 'Owner cannot read household'; end if;
  if (select count(*) from public.household_members where household_id=hh and user_id=auth.uid()
    and role='owner' and status='active') <> 1 then raise exception 'Owner membership missing'; end if;

  begin
    perform public.create_household('  ');
    raise exception 'Empty name unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Household name is required' then raise; end if;
  end;
  begin
    perform public.create_household(null);
    raise exception 'Null name unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Household name is required' then raise; end if;
  end;

  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform public.create_household('Must not exist');
    raise exception 'Missing identity unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Authentication required' then raise; end if;
  end;
  perform set_config('request.jwt.claims',
    json_build_object('sub', original_claims::json->>'sub', 'role', 'authenticated')::text, true);
  begin
    perform public.create_household('Must not exist');
    raise exception 'Missing email unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Authenticated user email not found' then raise; end if;
  end;

  -- Simulate a separate signed-in principal without creating an Auth account.
  perform set_config('request.jwt.claims', json_build_object('sub',gen_random_uuid(),
    'email','smp-isolation-probe@example.invalid','role','authenticated')::text, true);
  if exists(select 1 from public.households where id=hh) then raise exception 'Cross-user read allowed'; end if;
  if exists(select 1 from public.household_members where household_id=hh) then
    raise exception 'Cross-user members read allowed'; end if;
  update public.households set name='Must not change' where id=hh;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user update allowed'; end if;
  begin
    insert into public.household_members(household_id,user_id,email,role,status)
      values(hh,auth.uid(),'smp-isolation-probe@example.invalid','owner','active');
    raise exception 'Cross-user owner self-enrollment allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.recipes(household_id,name) values(hh,'Must not exist');
    raise exception 'Cross-user recipe write allowed';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', original_claims, true);
end $$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $$ begin
  begin
    perform public.create_household('Must not exist');
    raise exception 'Anonymous RPC allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
RESET ROLE;
DO $$ begin
  if (select count(*) from public.households) <> current_setting('smp.households_before')::bigint + 1
    then raise exception 'Unexpected household writes'; end if;
  if (select count(*) from public.household_members) <> current_setting('smp.members_before')::bigint + 1
    then raise exception 'Unexpected membership writes'; end if;
end $$;
SELECT 'PASS: authenticated creation/read; empty/null/missing-auth/missing-email rejected; cross-user read/update/enrollment/recipe write denied; anonymous denied; all test data rolled back' AS result;
ROLLBACK;
