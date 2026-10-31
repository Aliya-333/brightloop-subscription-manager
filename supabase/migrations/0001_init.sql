-- Brightloop Subscription Manager — initial schema
-- Security model:
--   * Every table has Row Level Security ON and no policy for `anon` => signed-out users see nothing.
--   * Access is by role stored in public.profiles: Admin (everything), Staff (read/insert/update
--     business data, no deletes), Viewer (read only). Inactive profiles have no access at all.
--   * Roles/status can only be changed by an Admin (enforced by trigger, not only by policy).
--   * Document codes (SUB-/INV-/PAY-) are generated server-side so clients cannot spoof/collide.

-- ---------------------------------------------------------------- private helpers
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists private.bootstrap_admins (email text primary key);
revoke all on private.bootstrap_admins from public, anon, authenticated;

-- ---------------------------------------------------------------- profiles (= Team)
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '' check (char_length(name) <= 120),
  email      text not null check (char_length(email) <= 254),
  phone      text not null default '' check (char_length(phone) <= 40),
  role       text not null default 'Viewer'  check (role   in ('Admin','Staff','Viewer')),
  status     text not null default 'Inactive' check (status in ('Active','Inactive')),
  joined     date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));

-- role helpers: SECURITY DEFINER so RLS policies can read profiles without recursion
create function private.app_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'Active'
$$;
create function private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$ select private.app_role() is not null $$;
create function private.can_write() returns boolean
language sql stable security definer set search_path = '' as $$ select coalesce(private.app_role() in ('Admin','Staff'), false) $$;
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$ select coalesce(private.app_role() = 'Admin', false) $$;
revoke all on function private.app_role(), private.is_member(), private.can_write(), private.is_admin() from public, anon;
grant execute on function private.app_role(), private.is_member(), private.can_write(), private.is_admin() to authenticated;

-- ---------------------------------------------------------------- generic triggers
create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

create function private.set_created_by() returns trigger
language plpgsql security definer set search_path = '' as $$
begin new.created_by := (select auth.uid()); return new; end $$;

-- sequences for human-readable codes
create sequence private.subscription_seq;
create sequence private.invoice_seq;
create sequence private.payment_seq;

create function private.assign_code() returns trigger
language plpgsql security definer set search_path = '' as $$
declare prefix text := tg_argv[0]; seq regclass := tg_argv[1]::regclass; col text := tg_argv[2];
        code text;
begin
  code := prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(nextval(seq)::text, 3, '0');
  -- always overwrite whatever the client sent
  if col = 'id' then new.id := code; else new.payment_id := code; end if;
  return new;
end $$;

-- ---------------------------------------------------------------- profile guards
create function private.guard_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid());
begin
  -- service_role / SQL editor have no auth.uid(); everyone else goes through the checks
  if tg_op = 'UPDATE' and caller is not null and not private.is_admin() then
    if new.id <> old.id or new.role <> old.role or new.status <> old.status
       or new.email <> old.email or new.joined <> old.joined then
      raise exception 'Only an administrator can change role, status or email' using errcode = '42501';
    end if;
  end if;

  -- never leave the workspace without an active admin
  if (tg_op = 'DELETE' and old.role = 'Admin' and old.status = 'Active')
     or (tg_op = 'UPDATE' and old.role = 'Admin' and old.status = 'Active'
         and (new.role <> 'Admin' or new.status <> 'Active')) then
    if not exists (select 1 from public.profiles
                   where role = 'Admin' and status = 'Active' and id <> old.id) then
      raise exception 'The last active administrator cannot be removed or demoted' using errcode = '23514';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger profiles_guard before update or delete on public.profiles
  for each row execute function private.guard_profile();
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- new auth user -> profile. Locked down by default: only an email listed in
-- private.bootstrap_admins becomes the first Admin; everybody else is an Inactive Viewer
-- until an Admin activates them.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare is_boot boolean;
begin
  perform pg_advisory_xact_lock(748213);
  is_boot := exists (select 1 from private.bootstrap_admins b where lower(b.email) = lower(new.email))
             and not exists (select 1 from public.profiles where role = 'Admin');
  insert into public.profiles (id, email, name, role, status)
  values (new.id, new.email,
          left(coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)), 120),
          case when is_boot then 'Admin' else 'Viewer' end,
          case when is_boot then 'Active' else 'Inactive' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.sync_user_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id and email <> new.email;
  return new;
end $$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function private.sync_user_email();

-- ---------------------------------------------------------------- business tables
create table public.products (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 1 and 160),
  type        text not null check (char_length(type) between 1 and 60),
  category    text not null check (char_length(category) between 1 and 60),
  sales_price numeric(12,2) not null check (sales_price >= 0),
  cost_price  numeric(12,2) not null check (cost_price  >= 0),
  variant     text not null default '' check (char_length(variant) <= 120),
  extra_price numeric(12,2) not null default 0 check (extra_price >= 0),
  notes       text not null default '' check (char_length(notes) <= 2000),
  active      boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.plans (
  id           bigint generated always as identity primary key,
  name         text not null check (char_length(name) between 1 and 160),
  description  text not null default '' check (char_length(description) <= 2000),
  price        numeric(12,2) not null check (price >= 0),
  cycle        text not null check (cycle in ('Daily','Weekly','Monthly','Yearly')),
  min_quantity integer not null default 1 check (min_quantity >= 1),
  start_date   date,
  end_date     date,
  auto_renew   boolean not null default true,
  allow_pause  boolean not null default false,
  early_closure boolean not null default false,
  active       boolean not null default true,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.customers (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 1 and 160),
  email      text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(email) <= 254),
  phone      text not null default '' check (char_length(phone) <= 40),
  company    text not null default '' check (char_length(company) <= 160),
  address    text not null default '' check (char_length(address) <= 500),
  joined     date not null default current_date,
  status     text not null default 'Active' check (status in ('Active','Inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_email_key on public.customers (lower(email));

create table public.subscriptions (
  id            text primary key,                      -- SUB-YYYY-NNN, assigned by trigger
  customer      text not null check (char_length(customer) between 1 and 160),
  email         text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(email) <= 254),
  plan          text not null check (char_length(plan) between 1 and 160),
  amount        numeric(12,2) not null check (amount > 0),
  cycle         text not null check (cycle in ('Daily','Weekly','Monthly','Yearly')),
  start_date    date not null,
  end_date      date not null,
  payment_terms text not null default 'Due immediately' check (char_length(payment_terms) <= 60),
  status        text not null default 'Pending' check (status in ('Active','Pending','Paused','Closed')),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date > start_date)
);

create table public.invoices (
  id           text primary key,                       -- INV-YYYY-NNN, assigned by trigger
  customer     text not null check (char_length(customer) between 1 and 160),
  email        text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(email) <= 254),
  subscription text not null default '' check (char_length(subscription) <= 40),
  issue_date   date not null,
  due_date     date not null,
  amount       numeric(12,2) not null check (amount > 0),
  status       text not null default 'Draft' check (status in ('Draft','Confirmed','Paid','Overdue')),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (due_date >= issue_date)
);

create table public.payments (
  id         bigint generated always as identity primary key,
  payment_id text not null unique,                     -- PAY-YYYY-NNN, assigned by trigger
  customer   text not null check (char_length(customer) between 1 and 160),
  invoice    text not null default '' check (char_length(invoice) <= 40),
  method     text not null check (char_length(method) between 1 and 60),
  amount     numeric(12,2) not null check (amount > 0),
  date       date not null,
  status     text not null default 'Pending' check (status in ('Completed','Pending','Failed')),
  note       text not null default '' check (char_length(note) <= 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discounts (
  id           bigint generated always as identity primary key,
  code         text not null check (code ~ '^[A-Za-z0-9_-]{2,40}$'),
  name         text not null check (char_length(name) between 1 and 160),
  type         text not null check (type in ('Percentage','Fixed')),
  value        numeric(12,2) not null check (value > 0),
  min_purchase numeric(12,2) not null default 0 check (min_purchase >= 0),
  min_quantity integer not null default 1 check (min_quantity >= 1),
  start_date   date not null,
  end_date     date not null,
  usage_limit  integer not null default 0 check (usage_limit >= 0),
  used_count   integer not null default 0 check (used_count >= 0),
  applies_to   text not null check (applies_to in ('Products','Subscriptions','Both')),
  status       text not null default 'Active' check (status in ('Active','Scheduled','Expired','Inactive')),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date >= start_date),
  check (type <> 'Percentage' or value <= 100)
);
create unique index discounts_code_key on public.discounts (upper(code));

-- one row of workspace-wide settings (admin-writable)
create table public.workspace_settings (
  id          boolean primary key default true check (id),   -- singleton
  general     jsonb not null default '{}'::jsonb check (pg_column_size(general) < 4096),
  preferences jsonb not null default '{}'::jsonb check (pg_column_size(preferences) < 4096),
  notifications jsonb not null default '{}'::jsonb check (pg_column_size(notifications) < 4096),
  updated_at  timestamptz not null default now()
);
insert into public.workspace_settings default values;

create table public.support_tickets (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  email      text not null check (char_length(email) between 3 and 254),
  subject    text not null check (char_length(subject) between 1 and 200),
  message    text not null check (char_length(message) between 1 and 5000),
  status     text not null default 'Open' check (status in ('Open','Closed')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- attach triggers
do $$
declare t text;
begin
  foreach t in array array['products','plans','customers','subscriptions','invoices','payments','discounts'] loop
    execute format('create trigger %I before insert on public.%I for each row execute function private.set_created_by()', t||'_created_by', t);
    execute format('create trigger %I before update on public.%I for each row execute function private.touch_updated_at()', t||'_touch', t);
  end loop;
end $$;
create trigger workspace_settings_touch before update on public.workspace_settings
  for each row execute function private.touch_updated_at();

create trigger subscriptions_code before insert on public.subscriptions
  for each row execute function private.assign_code('SUB','private.subscription_seq','id');
create trigger invoices_code before insert on public.invoices
  for each row execute function private.assign_code('INV','private.invoice_seq','id');
create trigger payments_code before insert on public.payments
  for each row execute function private.assign_code('PAY','private.payment_seq','payment_id');

-- codes are immutable
create function private.lock_code() returns trigger
language plpgsql set search_path = '' as $$
begin
  if to_jsonb(new)->>tg_argv[0] is distinct from to_jsonb(old)->>tg_argv[0] then
    raise exception '% cannot be changed', tg_argv[0] using errcode = '42501';
  end if;
  return new;
end $$;
create trigger subscriptions_lock before update on public.subscriptions for each row execute function private.lock_code('id');
create trigger invoices_lock      before update on public.invoices      for each row execute function private.lock_code('id');
create trigger payments_lock      before update on public.payments      for each row execute function private.lock_code('payment_id');

-- ---------------------------------------------------------------- Row Level Security
alter table public.profiles           enable row level security;
alter table public.products           enable row level security;
alter table public.plans              enable row level security;
alter table public.customers          enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.invoices           enable row level security;
alter table public.payments           enable row level security;
alter table public.discounts          enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.support_tickets    enable row level security;
-- FORCE so even table owners (other than superuser/bypassrls roles) obey policies
alter table public.profiles           force row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using ((select private.is_member()) or id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using ((select private.is_admin()) or id = (select auth.uid()))
  with check ((select private.is_admin()) or id = (select auth.uid()));
create policy profiles_delete on public.profiles for delete to authenticated
  using ((select private.is_admin()));
-- no INSERT policy: rows are created only by the auth trigger / service role

-- business tables: read = any active member, insert/update = Admin|Staff, delete = Admin
do $$
declare t text;
begin
  foreach t in array array['products','plans','customers','subscriptions','invoices','payments','discounts'] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_member()))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.can_write()))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.can_write())) with check ((select private.can_write()))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))', t||'_delete', t);
  end loop;
end $$;

create policy settings_select on public.workspace_settings for select to authenticated
  using ((select private.is_member()));
create policy settings_update on public.workspace_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy tickets_select on public.support_tickets for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy tickets_insert on public.support_tickets for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_member()));
create policy tickets_update on public.support_tickets for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------------------------------------------------------------- table privileges (defence in depth)
-- Supabase grants broad default privileges to anon/authenticated; strip them and grant only what is needed.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (name, phone, role, status) on public.profiles to authenticated;   -- admins; trigger blocks non-admins from role/status
grant delete on public.profiles to authenticated;

grant select, insert, update, delete on
  public.products, public.plans, public.customers, public.subscriptions,
  public.invoices, public.payments, public.discounts to authenticated;
grant select, update (general, preferences, notifications) on public.workspace_settings to authenticated;
grant select, insert on public.support_tickets to authenticated;
grant update (status) on public.support_tickets to authenticated;
