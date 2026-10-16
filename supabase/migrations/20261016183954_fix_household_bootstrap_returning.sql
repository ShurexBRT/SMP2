-- SMP-2: preserve SECURITY INVOKER, existing ACL and all membership policies.
-- INSERT RETURNING required SELECT before the caller's membership existed.
CREATE OR REPLACE FUNCTION public.create_household(household_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
declare
  uid uuid := auth.uid();
  user_email text := auth.jwt() ->> 'email';
  new_household uuid;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if user_email is null or length(trim(user_email)) = 0 then
    raise exception 'Authenticated user email not found';
  end if;
  if household_name is null or length(trim(household_name)) = 0 then
    raise exception 'Household name is required';
  end if;

  new_household := pg_catalog.gen_random_uuid();
  insert into public.households(id, name, created_by)
  values (new_household, trim(household_name), uid);

  insert into public.household_members(household_id, user_id, email, role, status)
  values (new_household, uid, lower(user_email), 'owner', 'active');

  return new_household;
end;
$function$;
