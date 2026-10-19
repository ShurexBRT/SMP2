-- Run using a privileged SQL connection. All fixtures are rolled back.
begin;
do $$
declare u uuid; e text; h uuid := gen_random_uuid(); other_h uuid := gen_random_uuid(); l uuid := gen_random_uuid(); i uuid := gen_random_uuid();
begin
  select user_id,email into strict u,e from public.household_members where role='owner' and status='active' and user_id is not null limit 1;
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated','email',e)::text,true);
  perform set_config('smp.test_hh',h::text,true);
  perform set_config('smp.test_other',other_h::text,true);
  perform set_config('smp.test_list',l::text,true);
  perform set_config('smp.test_ingredient',i::text,true);
  insert into public.households(id,name,created_by) values(h,'ROLLBACK stock QA',u),(other_h,'ROLLBACK isolation QA',u);
  insert into public.household_members(household_id,user_id,email,role,status) values(h,u,e,'owner','active');
  insert into public.shopping_lists(id,household_id,week_start) values(l,h,current_date);
  insert into public.ingredients(id,household_id,name,default_unit) values(i,h,'QA Pirinač','g');
  insert into public.inventory_items(household_id,ingredient_id,qty,unit) values(h,i,100,'g');
end $$;
set local role authenticated;
do $$
declare h uuid := current_setting('smp.test_hh')::uuid; l uuid := current_setting('smp.test_list')::uuid;
  i uuid := current_setting('smp.test_ingredient')::uuid; s uuid := gen_random_uuid(); m uuid := gen_random_uuid(); n integer;
begin
  insert into public.shopping_list_items(id,household_id,shopping_list_id,ingredient_id,label,qty,unit,source,checked)
    values(s,h,l,i,'QA Pirinač',0.5,'kg','manual',true);
  assert (select qty=600 from public.inventory_items where household_id=h and ingredient_id=i),'INSERT credit conversion';
  assert (select inventory_transferred_at is not null from public.shopping_list_items where id=s),'persist marker';
  update public.shopping_list_items set checked=true,inventory_transferred_at=null where id=s;
  assert (select qty=600 from public.inventory_items where household_id=h and ingredient_id=i),'retry credit once';
  assert (select inventory_transferred_at is not null from public.shopping_list_items where id=s),'marker tamper';
  begin
    update public.shopping_list_items set qty=2 where id=s;
    raise exception 'FAIL immutable purchased qty';
  exception when raise_exception then
    if sqlerrm='FAIL immutable purchased qty' then raise; end if;
  end;
  update public.shopping_list_items set checked=false where id=s;
  assert (select qty=100 from public.inventory_items where household_id=h and ingredient_id=i),'undo exact amount';
  update public.shopping_list_items set checked=false where id=s;
  assert (select qty=100 from public.inventory_items where household_id=h and ingredient_id=i),'undo retry once';
  update public.shopping_list_items set checked=true where id=s;
  update public.inventory_items set qty=10 where household_id=h and ingredient_id=i;
  begin
    update public.shopping_list_items set checked=false where id=s;
    raise exception 'FAIL consumed undo';
  exception when raise_exception then
    if sqlerrm='FAIL consumed undo' then raise; end if;
  end;
  assert (select checked from public.shopping_list_items where id=s),'failed undo keeps checkbox';
  assert (select qty=10 from public.inventory_items where household_id=h and ingredient_id=i),'failed undo keeps stock';
  update public.inventory_items set qty=600 where household_id=h and ingredient_id=i;
  update public.shopping_list_items set checked=false where id=s;
  update public.inventory_items set unit='l' where household_id=h and ingredient_id=i;
  begin
    update public.shopping_list_items set checked=true where id=s;
    raise exception 'FAIL incompatible unit';
  exception when invalid_parameter_value then null;
  end;
  assert (select not checked from public.shopping_list_items where id=s),'unit error rolls back checkbox';
  insert into public.shopping_list_items(id,household_id,shopping_list_id,label,qty,unit,source,checked)
    values(m,h,l,'QA Kafa',250,'g','manual',true);
  assert (select ingredient_id is not null from public.shopping_list_items where id=m),'manual ingredient created';
  assert (select count(*)=1 from public.inventory_items v join public.ingredients f on f.id=v.ingredient_id where v.household_id=h and f.name='QA Kafa' and v.qty=250),'manual stock credit';
  begin
    insert into public.shopping_list_items(household_id,shopping_list_id,label,source,checked) values(h,l,'Unknown amount','manual',true);
    raise exception 'FAIL missing quantity';
  exception when invalid_parameter_value then null;
  end;
  assert (select count(*)=0 from public.households where id=current_setting('smp.test_other')::uuid),'cross household read';
  begin
    insert into public.ingredients(household_id,name,default_unit) values(current_setting('smp.test_other')::uuid,'Forbidden','g');
    raise exception 'FAIL cross household write';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.shopping_list_items where household_id=h;
  assert n=2,'failed operations left no rows';
  -- Removing history is independent of undo, and must preserve existing stock.
  delete from public.shopping_list_items where household_id=h and id=m and checked=true;
  assert (select count(*)=0 from public.shopping_list_items where id=m),'manual purchase history removed';
  assert (select v.qty=250 from public.inventory_items v join public.ingredients f on f.id=v.ingredient_id where v.household_id=h and f.name='QA Kafa'),'history deletion preserves stock';
  -- Expected checked state protects an item that another client has unchecked.
  delete from public.shopping_list_items where household_id=h and id=s and checked=true;
  assert (select count(*)=1 from public.shopping_list_items where id=s),'stale checked delete preserves unchecked item';
  update public.shopping_list_items set unit='g',source='plan' where id=s;
  update public.inventory_items set unit='g' where household_id=h and ingredient_id=i;
  update public.shopping_list_items set checked=true where id=s;
  delete from public.inventory_items where household_id=h and ingredient_id=i;
  begin
    update public.shopping_list_items set checked=false where id=s;
    raise exception 'FAIL missing stock undo';
  exception when raise_exception then
    if sqlerrm='FAIL missing stock undo' then raise; end if;
  end;
  assert (select checked from public.shopping_list_items where id=s),'missing stock undo remains atomic';
  delete from public.shopping_list_items where household_id=h and id=s and checked=true;
  assert (select count(*)=0 from public.shopping_list_items where id=s),'plan history removable after stock deletion';
  assert (select count(*)=0 from public.inventory_items where household_id=h and ingredient_id=i),'history deletion never recreates stock';
end $$;
reset role;
set constraints all immediate;
do $$ begin
  assert (select count(*)=0 from private.shopping_inventory_receipts where household_id=current_setting('smp.test_hh')::uuid),'history receipt cascade';
end $$;
select 'PASS: purchase sync, RLS isolation, safe undo, history deletion with and without stock, stale checked guard, receipt cascade, deferred FKs' as result;
rollback;
