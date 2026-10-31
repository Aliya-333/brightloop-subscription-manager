-- Phase 1 verification script. Run on a SCRATCH / branch database that already has migrations
-- 0001-0008 applied (psql -v ON_ERROR_STOP=1 -f phase1_tests.sql, or paste into the SQL editor).
-- Everything runs in one transaction that is ROLLED BACK at the end, so nothing persists.
-- Each check prints "PASS ..." or aborts with "FAIL ...". These were NOT executed by the author
-- (no Postgres available in the authoring sandbox) — treat the first run as the real test.
begin;

-- ===================================================================== fixtures (as postgres)
insert into public.customers (name, email) values
  ('Test Cust One', 'cust1@t.test'), ('Test Cust Two', 'cust2@t.test');
insert into public.plans (name, price, cycle) values ('Test Plan', 100, 'Monthly');

-- staff-side users (profiles are created Inactive/Viewer by the trigger, then promoted as postgres)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@t.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'staff@t.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'rando@t.test');
update public.profiles set role = 'Admin', status = 'Active' where email = 'admin@t.test';
update public.profiles set role = 'Staff', status = 'Active' where email = 'staff@t.test';

-- customer users, onboarded ONLY through invites
select public.create_customer_invite((select id from public.customers where email = 'cust1@t.test'), 'cust1@t.test', null);
select public.create_customer_invite((select id from public.customers where email = 'cust2@t.test'), 'cust2@t.test', null);
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'cust1@t.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'cust2@t.test');

-- business data written the way the existing UI writes it (TEXT only, no *_id)
insert into public.subscriptions (customer, email, plan, amount, cycle, start_date, end_date)
  select name, email, 'Test Plan', 100, 'Monthly', current_date, current_date + 30
  from public.customers where email in ('cust1@t.test', 'cust2@t.test');
insert into public.invoices (customer, email, subscription, issue_date, due_date, amount, status)
  select s.customer, s.email, s.id, current_date, current_date + 30, 100, 'Confirmed'
  from public.subscriptions s where s.email in ('cust1@t.test', 'cust2@t.test');
insert into public.invoices (customer, email, subscription, issue_date, due_date, amount, status)
  select s.customer, s.email, s.id, current_date, current_date + 30, 55, 'Draft'
  from public.subscriptions s where s.email = 'cust1@t.test';
insert into public.payments (customer, invoice, method, amount, date, status)
  select i.customer, i.id, 'Card', 100, current_date, 'Completed'
  from public.invoices i where i.status = 'Confirmed' and i.email in ('cust1@t.test', 'cust2@t.test');

insert into public.products (name, type, category, sales_price, cost_price) values
  ('P-A', 'Service', 'Test', 10, 5), ('P-B', 'Service', 'Test', 20, 8);
insert into public.product_variants (product_id, variant_name, sku, sales_price)
  select id, 'Large', 'SKU-A-L', 12 from public.products where name = 'P-A';
insert into public.subscription_items (subscription_id, product_id, variant_id, quantity, unit_price, discount_amount, tax_amount)
  select s.id, p.id, v.id, 2, 10, 1, 0.5
  from public.subscriptions s, public.products p, public.product_variants v
  where s.email in ('cust1@t.test', 'cust2@t.test') and p.name = 'P-A' and v.sku = 'SKU-A-L';
insert into public.invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate)
  select i.id, p.id, 'line', 3, 10, 10 from public.invoices i, public.products p
  where i.status = 'Confirmed' and p.name = 'P-A';
insert into public.quotations (customer_id, valid_until, status)
  select id, current_date + 30, 'Sent' from public.customers where email in ('cust1@t.test', 'cust2@t.test');
insert into public.quotations (customer_id, valid_until, status)
  select id, current_date + 30, 'Draft' from public.customers where email = 'cust1@t.test';
insert into public.quotation_items (quotation_id, description, quantity, unit_price)
  select id, 'q-line', 1, 40 from public.quotations;

-- ===================================================================== as postgres: structure
do $$
declare n int;
begin
  -- automatic linking of text-only writes
  select count(*) into n from public.subscriptions where customer_id is null or plan_id is null;
  assert n = 0, 'FAIL: subscriptions not linked by trigger';
  select count(*) into n from public.invoices where customer_id is null or subscription_id is null;
  assert n = 0, 'FAIL: invoices not linked by trigger';
  select count(*) into n from public.payments where customer_id is null or invoice_id is null;
  assert n = 0, 'FAIL: payments not linked by trigger';
  raise notice 'PASS text writes are linked to customer/plan/subscription/invoice ids';

  -- server-computed totals: 2*10 - 1 + 0.5 = 19.50 ; 3*10 + 10% = 33.00
  assert (select max(line_total) from public.subscription_items) = 19.50, 'FAIL: subscription_items.line_total';
  assert (select max(line_total) from public.invoice_items) = 33.00, 'FAIL: invoice_items.line_total';
  raise notice 'PASS line totals computed by the database';

  -- customer accounts linked through invites
  assert (select count(*) from public.profiles where role = 'Customer' and status = 'Active' and customer_id is not null) = 2,
    'FAIL: customer profiles not linked';
  assert (select role from public.profiles where email = 'rando@t.test') = 'Viewer'
     and (select status from public.profiles where email = 'rando@t.test') = 'Inactive', 'FAIL: uninvited user not locked down';
  raise notice 'PASS invited emails become linked Customers; uninvited users stay Inactive Viewers';

  -- second account for an already-linked customer / second invite cannot be created
  begin
    perform public.create_customer_invite((select id from public.customers where email = 'cust1@t.test'), 'other@t.test', null);
    raise exception 'FAIL: duplicate linking allowed';
  exception when unique_violation then raise notice 'PASS duplicate customer linking refused'; end;

  -- expired invite does not link
  insert into public.customers (name, email) values ('Test Cust Three', 'cust3@t.test');
  perform public.create_customer_invite((select id from public.customers where email = 'cust3@t.test'), 'cust3@t.test', null);
  update private.customer_invites set expires_at = now() - interval '1 day' where lower(email) = 'cust3@t.test';
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c3', 'cust3@t.test');
  assert (select role from public.profiles where email = 'cust3@t.test') = 'Viewer', 'FAIL: expired invite linked';
  raise notice 'PASS expired invite ignored';

  -- constraints / FKs
  begin
    insert into public.subscription_items (subscription_id, product_id, variant_id, unit_price)
      select s.id, p.id, v.id, 1 from public.subscriptions s, public.products p, public.product_variants v
      where p.name = 'P-B' and v.sku = 'SKU-A-L' limit 1;
    raise exception 'FAIL: variant/product mismatch accepted';
  exception when check_violation then raise notice 'PASS variant must belong to product'; end;
  begin
    delete from public.products where name = 'P-A';
    raise exception 'FAIL: product used by subscription_items was deleted';
  exception when foreign_key_violation then raise notice 'PASS product delete restricted while used by subscription items'; end;
  begin
    delete from public.customers where email = 'cust1@t.test';
    raise exception 'FAIL: customer with portal account / quotations deleted';
  exception when foreign_key_violation then raise notice 'PASS customer delete restricted (account + quotations)'; end;
end $$;

-- ===================================================================== customer 1
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int;
begin
  assert (select count(*) from public.customers) = 1, 'FAIL: customer sees other customers';
  assert (select email from public.customers) = 'cust1@t.test', 'FAIL: wrong customer visible';
  assert (select count(*) from public.subscriptions) = 1, 'FAIL: subscriptions scope';
  assert (select count(*) from public.subscription_items) = 1, 'FAIL: subscription_items scope';
  assert (select count(*) from public.invoices) = 1, 'FAIL: invoices scope (own non-draft only)';
  assert (select count(*) from public.invoice_items) = 1, 'FAIL: invoice_items scope';
  assert (select count(*) from public.payments) = 1, 'FAIL: payments scope';
  assert (select count(*) from public.quotations) = 1, 'FAIL: quotations scope (own non-draft only)';
  assert (select count(*) from public.quotation_items) = 1, 'FAIL: quotation_items scope';
  assert (select count(*) from public.invoices where email = 'cust2@t.test') = 0, 'FAIL: cross-customer read';
  assert (select count(*) from public.profiles) = 1, 'FAIL: customer sees other profiles';
  assert (select count(*) from public.products) = 0 and (select count(*) from public.plans) = 0
     and (select count(*) from public.product_variants) = 0 and (select count(*) from public.discounts) = 0
     and (select count(*) from public.quotation_templates) = 0, 'FAIL: internal tables readable';
  raise notice 'PASS customer 1 sees only its own records; cross-customer reads return nothing';

  update public.payments set status = 'Failed'; get diagnostics n = row_count;
  assert n = 0, 'FAIL: customer modified payments';
  update public.subscriptions set amount = 1; get diagnostics n = row_count;
  assert n = 0, 'FAIL: customer modified subscription price';
  update public.invoice_items set discount_amount = 5; get diagnostics n = row_count;
  assert n = 0, 'FAIL: customer modified discounts';
  delete from public.invoices; get diagnostics n = row_count;
  assert n = 0, 'FAIL: customer deleted invoices';
  begin
    insert into public.invoices (customer, email, issue_date, due_date, amount) values ('x','cust1@t.test', current_date, current_date, 1);
    raise exception 'FAIL: customer created an invoice';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS customer cannot write or delete financial records';

  begin update public.profiles set role = 'Admin'; raise exception 'FAIL: role escalation';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set status = 'Active', role = 'Staff'; raise exception 'FAIL: role escalation';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set customer_id = (select id from public.customers limit 1) + 1; raise exception 'FAIL: relink to another customer';
  exception when insufficient_privilege then null; end;
  begin insert into public.profiles (id, email, role, status) values (gen_random_uuid(), 'new@t.test', 'Admin', 'Active'); raise exception 'FAIL: customer created a profile';
  exception when insufficient_privilege then null; end;
  begin perform public.dashboard_stats(); raise exception 'FAIL: customer ran staff dashboard';
  exception when insufficient_privilege then null; end;
  begin perform public.create_customer_invite(1, 'z@t.test', null); raise exception 'FAIL: customer can invite';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS role escalation / relinking / staff functions blocked for customers';
end $$;
reset role;

-- ===================================================================== customer 2 (cross-check)
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c2', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  assert (select email from public.customers) = 'cust2@t.test' and (select count(*) from public.invoices) = 1,
    'FAIL: customer 2 scope';
  raise notice 'PASS customer 2 sees only customer 2';
end $$;
reset role;

-- ===================================================================== uninvited / inactive user
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.invoices) = 0 and (select count(*) from public.customers) = 0, 'FAIL: inactive user reads data';
  raise notice 'PASS inactive user sees nothing';
end $$;
reset role;

-- ===================================================================== staff
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000b1', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int;
begin
  assert (select count(*) from public.invoices) = 3 and (select count(*) from public.customers) = 3, 'FAIL: staff read';
  assert (select count(*) from public.profiles where role = 'Customer') = 0, 'FAIL: staff list exposes customer accounts';
  update public.invoices set status = 'Paid' where status = 'Draft'; get diagnostics n = row_count;
  assert n = 1, 'FAIL: staff cannot update';
  delete from public.invoices; get diagnostics n = row_count;
  assert n = 0, 'FAIL: staff delete';
  begin update public.profiles set role = 'Admin' where id = auth.uid(); raise exception 'FAIL: staff self-promotion';
  exception when insufficient_privilege then null; end;
  begin perform public.create_customer_invite(1, 'z@t.test', null); raise exception 'FAIL: staff can invite';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS staff: read/insert/update yes, delete no, no escalation, no customer accounts listed';
end $$;
reset role;

-- ===================================================================== admin + dashboard > 1000 rows
insert into public.invoices (customer, email, issue_date, due_date, amount, status)
  select 'Bulk', 'cust2@t.test', current_date, current_date + 1, 10, 'Paid' from generate_series(1, 1500);
insert into public.payments (customer, method, amount, date, status)
  select 'Bulk', 'Card', 5, current_date, 'Completed' from generate_series(1, 1500);
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare s jsonb := public.dashboard_stats();
begin
  assert (select count(*) from public.invoices where status = 'Paid') > 1000, 'FAIL: fixture too small';
  assert (s->>'paid_invoice_amount')::numeric = (select sum(amount) from public.invoices where status = 'Paid'), 'FAIL: paid total';
  assert (s->>'completed_payment_amount')::numeric = (select sum(amount) from public.payments where status = 'Completed'), 'FAIL: payments total';
  assert (s->>'total_invoices')::int = (select count(*) from public.invoices), 'FAIL: invoice count';
  raise notice 'PASS dashboard_stats() exact with % paid invoices (> 1000)', (select count(*) from public.invoices where status = 'Paid');
  begin
    update public.profiles set role = 'Customer' where email = 'staff@t.test'; raise exception 'FAIL: admin made a customer role via API';
  exception when insufficient_privilege or check_violation then raise notice 'PASS admin cannot hand out the Customer role through the API'; end;
end $$;
reset role;

select * from private.link_audit;   -- relationships that could not be matched (expected: only fixtures with no match)
rollback;
