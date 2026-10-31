-- Phase 1 / step 2 — real foreign keys next to the existing text columns.
-- The text columns (customer, email, plan, subscription, invoice) are KEPT: the current UI reads
-- and writes them. The new *_id columns are filled automatically by triggers when the text can be
-- matched reliably, so the UI keeps working untouched.
-- Link columns stay NULLABLE on purpose: a row whose text cannot be matched must still be insertable.
-- Legacy tables use ON DELETE SET NULL so existing "admin can delete" behaviour keeps working and the
-- text snapshot keeps the historical record readable.
begin;

alter table public.subscriptions
  add column if not exists customer_id bigint references public.customers(id) on delete set null,
  add column if not exists plan_id     bigint references public.plans(id)     on delete set null;
alter table public.invoices
  add column if not exists customer_id     bigint references public.customers(id)     on delete set null,
  add column if not exists subscription_id text   references public.subscriptions(id) on delete set null;
alter table public.payments
  add column if not exists customer_id bigint references public.customers(id) on delete set null,
  add column if not exists invoice_id  text   references public.invoices(id)  on delete set null;

-- ------------------------------------------------------------ reliable matchers
-- customers.email is unique (case-insensitive) => an email match is deterministic.
create or replace function private.match_customer_by_email(p_email text) returns bigint
language sql stable set search_path = '' as $$
  select c.id from public.customers c where lower(c.email) = lower(btrim(p_email))
$$;
-- names are NOT unique: only link when exactly one row carries that name.
create or replace function private.match_customer_by_name(p_name text) returns bigint
language sql stable set search_path = '' as $$
  select (array_agg(c.id))[1] from public.customers c
  where lower(btrim(c.name)) = lower(btrim(p_name)) having count(*) = 1
$$;
create or replace function private.match_plan_by_name(p_name text) returns bigint
language sql stable set search_path = '' as $$
  select (array_agg(p.id))[1] from public.plans p
  where lower(btrim(p.name)) = lower(btrim(p_name)) having count(*) = 1
$$;

-- ------------------------------------------------------------ backfill (existing rows)
-- updated_at must not move because of a backfill
alter table public.subscriptions disable trigger subscriptions_touch;
alter table public.invoices      disable trigger invoices_touch;
alter table public.payments      disable trigger payments_touch;

update public.subscriptions s set customer_id = private.match_customer_by_email(s.email) where s.customer_id is null;
update public.subscriptions s set plan_id     = private.match_plan_by_name(s.plan)       where s.plan_id is null;

update public.invoices i set customer_id = private.match_customer_by_email(i.email) where i.customer_id is null;
update public.invoices i set subscription_id = s.id
  from public.subscriptions s
  where i.subscription_id is null and i.subscription <> '' and s.id = upper(btrim(i.subscription));

update public.payments p set invoice_id = i.id
  from public.invoices i
  where p.invoice_id is null and p.invoice <> '' and i.id = upper(btrim(p.invoice));
update public.payments p set customer_id = i.customer_id
  from public.invoices i where p.customer_id is null and i.id = p.invoice_id;
update public.payments p set customer_id = private.match_customer_by_name(p.customer) where p.customer_id is null;

alter table public.subscriptions enable trigger subscriptions_touch;
alter table public.invoices      enable trigger invoices_touch;
alter table public.payments      enable trigger payments_touch;

-- ------------------------------------------------------------ unmatched report (nothing is guessed)
create or replace view private.link_audit as
  select 'subscriptions'::text as tbl, s.id::text as ref, 'customer_id'::text as missing, s.email as text_value
    from public.subscriptions s where s.customer_id is null
  union all
  select 'subscriptions', s.id, 'plan_id', s.plan from public.subscriptions s where s.plan_id is null
  union all
  select 'invoices', i.id, 'customer_id', i.email from public.invoices i where i.customer_id is null
  union all
  select 'invoices', i.id, 'subscription_id', i.subscription
    from public.invoices i where i.subscription_id is null and i.subscription <> ''
  union all
  select 'payments', p.payment_id, 'customer_id', p.customer from public.payments p where p.customer_id is null
  union all
  select 'payments', p.payment_id, 'invoice_id', p.invoice
    from public.payments p where p.invoice_id is null and p.invoice <> '';
revoke all on private.link_audit from public, anon, authenticated;

-- invoices whose linked customer differs from their linked subscription's customer
create or replace view private.link_conflicts as
  select i.id as invoice, i.customer_id as invoice_customer, s.id as subscription, s.customer_id as subscription_customer
  from public.invoices i join public.subscriptions s on s.id = i.subscription_id
  where i.customer_id is distinct from s.customer_id;
revoke all on private.link_conflicts from public, anon, authenticated;

do $$
declare n int;
begin
  select count(*) into n from private.link_audit;
  raise notice 'Phase 1 backfill: % unmatched link(s). Inspect with: select * from private.link_audit order by 1,2,3;', n;
end $$;

-- ------------------------------------------------------------ keep links filled for NEW writes
-- Re-resolve only when the text changed and the id was not changed explicitly in the same statement.
create or replace function private.link_subscription() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.customer_id is null then new.customer_id := private.match_customer_by_email(new.email); end if;
    if new.plan_id     is null then new.plan_id     := private.match_plan_by_name(new.plan); end if;
  else
    if new.email is distinct from old.email and new.customer_id is not distinct from old.customer_id then
      new.customer_id := private.match_customer_by_email(new.email);
    end if;
    if new.plan is distinct from old.plan and new.plan_id is not distinct from old.plan_id then
      new.plan_id := private.match_plan_by_name(new.plan);
    end if;
  end if;
  return new;
end $$;
create trigger subscriptions_link before insert or update on public.subscriptions
  for each row execute function private.link_subscription();

create or replace function private.link_invoice() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.customer_id is null then new.customer_id := private.match_customer_by_email(new.email); end if;
    if new.subscription_id is null and new.subscription <> '' then
      select s.id into new.subscription_id from public.subscriptions s where s.id = upper(btrim(new.subscription));
    end if;
  else
    if new.email is distinct from old.email and new.customer_id is not distinct from old.customer_id then
      new.customer_id := private.match_customer_by_email(new.email);
    end if;
    if new.subscription is distinct from old.subscription
       and new.subscription_id is not distinct from old.subscription_id then
      new.subscription_id := null;
      if new.subscription <> '' then
        select s.id into new.subscription_id from public.subscriptions s where s.id = upper(btrim(new.subscription));
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger invoices_link before insert or update on public.invoices
  for each row execute function private.link_invoice();

create or replace function private.link_payment() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.invoice is distinct from old.invoice
     and new.invoice_id is not distinct from old.invoice_id then
    new.invoice_id := null;
  end if;
  if new.invoice_id is null and new.invoice <> '' then
    select i.id into new.invoice_id from public.invoices i where i.id = upper(btrim(new.invoice));
  end if;

  if tg_op = 'UPDATE' and new.customer is distinct from old.customer
     and new.customer_id is not distinct from old.customer_id then
    new.customer_id := null;
  end if;
  if new.customer_id is null then
    if new.invoice_id is not null then
      select i.customer_id into new.customer_id from public.invoices i where i.id = new.invoice_id;
    end if;
    if new.customer_id is null then new.customer_id := private.match_customer_by_name(new.customer); end if;
  end if;
  return new;
end $$;
create trigger payments_link before insert or update on public.payments
  for each row execute function private.link_payment();

commit;
