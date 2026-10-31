-- Phase 1 / step 3 — the four requested tables, plus quotations / quotation_items.
-- Existing PKs are bigint (products, plans, customers) or text codes (subscriptions, invoices), so
-- foreign keys use those types; the NEW tables use uuid primary keys as specified.
-- quotations + quotation_items did not exist anywhere in the schema or UI but the spec requires
-- Customers -> Quotations and customer-level reads of quotations, so minimal tables are added.
-- All totals are computed by the database so clients cannot spoof prices.
begin;

-- ------------------------------------------------------------ product_variants
create table public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   bigint not null references public.products(id) on delete cascade,
  variant_name text not null check (char_length(variant_name) between 1 and 120),
  sku          text check (sku is null or char_length(sku) between 1 and 60),
  description  text not null default '' check (char_length(description) <= 2000),
  sales_price  numeric(12,2) not null check (sales_price >= 0),
  cost_price   numeric(12,2) not null default 0 check (cost_price >= 0),
  availability boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (product_id, variant_name)
);
create unique index product_variants_sku_key on public.product_variants (upper(sku)) where sku is not null;
-- products.variant (text) and products.extra_price are intentionally left untouched.

-- ------------------------------------------------------------ subscription_items
create table public.subscription_items (
  id              uuid primary key default gen_random_uuid(),
  subscription_id text   not null references public.subscriptions(id) on delete cascade,
  product_id      bigint not null references public.products(id)      on delete restrict,
  variant_id      uuid   references public.product_variants(id)       on delete restrict,
  quantity        integer       not null default 1 check (quantity > 0),
  unit_price      numeric(12,2) not null check (unit_price >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_amount      numeric(12,2) not null default 0 check (tax_amount >= 0),
  line_total      numeric(12,2) not null default 0 check (line_total >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (discount_amount <= quantity * unit_price)
);

-- ------------------------------------------------------------ quotation_templates
create table public.quotation_templates (
  id                    uuid primary key default gen_random_uuid(),
  template_name         text not null check (char_length(template_name) between 1 and 160),
  description           text not null default '' check (char_length(description) <= 2000),
  default_validity_days integer not null default 30 check (default_validity_days between 1 and 365),
  default_terms         text not null default '' check (char_length(default_terms) <= 10000),
  default_notes         text not null default '' check (char_length(default_notes) <= 5000),
  default_tax_settings  jsonb not null default '{}'::jsonb check (pg_column_size(default_tax_settings) < 4096),
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index quotation_templates_name_key on public.quotation_templates (lower(template_name));

-- ------------------------------------------------------------ invoice_items
create table public.invoice_items (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      text not null references public.invoices(id) on delete cascade,
  product_id      bigint references public.products(id)        on delete set null,
  variant_id      uuid   references public.product_variants(id) on delete set null,
  description     text not null check (char_length(description) between 1 and 500),
  quantity        integer       not null default 1 check (quantity > 0),
  unit_price      numeric(12,2) not null check (unit_price >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_rate        numeric(5,2)  not null default 0 check (tax_rate between 0 and 100),
  tax_amount      numeric(12,2) not null default 0 check (tax_amount >= 0),
  line_total      numeric(12,2) not null default 0 check (line_total >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (discount_amount <= quantity * unit_price)
);

-- ------------------------------------------------------------ quotations (+ items)
create sequence private.quotation_seq;
create table public.quotations (
  id           uuid primary key default gen_random_uuid(),
  quote_number text not null unique,                       -- QUO-YYYY-NNN, assigned by trigger
  customer_id  bigint not null references public.customers(id) on delete restrict,
  template_id  uuid references public.quotation_templates(id) on delete set null,
  status       text not null default 'Draft' check (status in ('Draft','Sent','Accepted','Rejected','Expired')),
  issue_date   date not null default current_date,
  valid_until  date not null,
  terms        text not null default '' check (char_length(terms) <= 10000),
  notes        text not null default '' check (char_length(notes) <= 5000),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (valid_until >= issue_date)
);
create table public.quotation_items (
  id              uuid primary key default gen_random_uuid(),
  quotation_id    uuid not null references public.quotations(id) on delete cascade,
  product_id      bigint references public.products(id)        on delete set null,
  variant_id      uuid   references public.product_variants(id) on delete set null,
  description     text not null check (char_length(description) between 1 and 500),
  quantity        integer       not null default 1 check (quantity > 0),
  unit_price      numeric(12,2) not null check (unit_price >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_amount      numeric(12,2) not null default 0 check (tax_amount >= 0),
  line_total      numeric(12,2) not null default 0 check (line_total >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (discount_amount <= quantity * unit_price)
);

-- ------------------------------------------------------------ server-side integrity triggers
create function private.compute_line_total() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'invoice_items' then
    new.tax_amount := round((new.quantity * new.unit_price - new.discount_amount) * new.tax_rate / 100, 2);
  end if;
  new.line_total := round(new.quantity * new.unit_price - new.discount_amount + new.tax_amount, 2);
  return new;
end $$;

-- a variant must belong to the product on the same line. An UPDATE that nulls product_id is allowed:
-- that is what ON DELETE SET NULL does when a product is deleted (the row must survive).
create function private.check_variant_product() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.variant_id is not null then
    if new.product_id is null then
      if tg_op = 'INSERT' then
        raise exception 'A variant requires a product' using errcode = '23514';
      end if;
    elsif not exists (
        select 1 from public.product_variants v where v.id = new.variant_id and v.product_id = new.product_id) then
      raise exception 'Variant does not belong to the selected product' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create function private.assign_quote_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.quote_number := 'QUO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('private.quotation_seq')::text, 3, '0');
  return new;
end $$;

create trigger subscription_items_total before insert or update on public.subscription_items
  for each row execute function private.compute_line_total();
create trigger invoice_items_total      before insert or update on public.invoice_items
  for each row execute function private.compute_line_total();
create trigger quotation_items_total    before insert or update on public.quotation_items
  for each row execute function private.compute_line_total();
create trigger subscription_items_variant before insert or update on public.subscription_items
  for each row execute function private.check_variant_product();
create trigger invoice_items_variant      before insert or update on public.invoice_items
  for each row execute function private.check_variant_product();
create trigger quotation_items_variant    before insert or update on public.quotation_items
  for each row execute function private.check_variant_product();
create trigger quotations_code before insert on public.quotations
  for each row execute function private.assign_quote_number();
create function private.lock_quote_number() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.quote_number is distinct from old.quote_number then
    raise exception 'quote_number cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger quotations_lock before update on public.quotations
  for each row execute function private.lock_quote_number();

create trigger quotation_templates_created_by before insert on public.quotation_templates
  for each row execute function private.set_created_by();
create trigger quotations_created_by before insert on public.quotations
  for each row execute function private.set_created_by();

do $$
declare t text;
begin
  foreach t in array array['product_variants','subscription_items','quotation_templates','invoice_items',
                           'quotations','quotation_items'] loop
    execute format('create trigger %I before update on public.%I for each row execute function private.touch_updated_at()', t||'_touch', t);
    -- RLS: same staff rules as the rest of the app (read = Admin/Staff/Viewer, write = Admin/Staff, delete = Admin)
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_member()))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.can_write()))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.can_write())) with check ((select private.can_write()))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))', t||'_delete', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

commit;
