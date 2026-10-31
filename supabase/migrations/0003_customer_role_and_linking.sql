-- Phase 1 / step 1 — Customer role, secure customer<->account link, invite-only onboarding.
-- Safe to run once on top of 0001/0002. Does not touch existing rows.
begin;

-- ------------------------------------------------------------ 1. role + link column
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.profiles'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%''Viewer''%';
  if c is not null then execute format('alter table public.profiles drop constraint %I', c); end if;
end $$;
alter table public.profiles
  add constraint profiles_role_check check (role in ('Admin','Staff','Viewer','Customer'));

-- RESTRICT: a customer record that still has a portal account cannot be deleted by accident.
alter table public.profiles
  add column if not exists customer_id bigint references public.customers(id) on delete restrict;
-- one portal account per customer
create unique index if not exists profiles_customer_id_key
  on public.profiles (customer_id) where customer_id is not null;
-- a Customer profile MUST be linked; nobody else may be
alter table public.profiles
  add constraint profiles_customer_link_chk check ((role = 'Customer') = (customer_id is not null));
-- note: customer_id is deliberately NOT in the column-level UPDATE grant from 0001,
-- so API clients can never write it.

-- ------------------------------------------------------------ 2. helpers
-- IMPORTANT: is_member() used to mean "any active profile". With a Customer role that would let
-- customers through every staff SELECT policy, so it now means staff-side roles only.
create or replace function private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.app_role() in ('Admin','Staff','Viewer'), false)
$$;

-- the ONLY source of "which customer am I" — derived from auth.uid(), never from client input
create or replace function private.customer_id() returns bigint
language sql stable security definer set search_path = '' as $$
  select p.customer_id from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'Active' and p.role = 'Customer'
$$;
revoke all on function private.customer_id() from public, anon;
grant execute on function private.customer_id() to authenticated;

-- ------------------------------------------------------------ 3. profile guard (extends 0001)
create or replace function private.guard_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid());
begin
  if tg_op = 'UPDATE' and caller is not null then
    if not private.is_admin() then
      if new.id <> old.id or new.role <> old.role or new.status <> old.status
         or new.email <> old.email or new.joined <> old.joined then
        raise exception 'Only an administrator can change role, status or email' using errcode = '42501';
      end if;
    end if;
    -- applies to EVERYONE using the API, admins included: customer links are server-side only
    if new.customer_id is distinct from old.customer_id
       or (new.role = 'Customer') is distinct from (old.role = 'Customer') then
      raise exception 'Customer accounts can only be linked or unlinked by the server' using errcode = '42501';
    end if;
  end if;

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

-- staff-side profile list must not expose customer accounts; customers see only themselves
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (((select private.is_member()) and role <> 'Customer') or id = (select auth.uid()));

-- ------------------------------------------------------------ 4. invitations
create table if not exists private.customer_invites (
  id          uuid primary key default gen_random_uuid(),
  customer_id bigint not null references public.customers(id) on delete cascade,
  email       text not null,
  invited_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  consumed_at timestamptz,
  consumed_by uuid
);
revoke all on private.customer_invites from public, anon, authenticated;
create unique index if not exists customer_invites_pending_email
  on private.customer_invites (lower(email)) where consumed_at is null;
create unique index if not exists customer_invites_pending_customer
  on private.customer_invites (customer_id) where consumed_at is null;

-- Auth user created -> profile. Same rules as 0001, plus: if (and only if) an Admin-created,
-- unexpired invite exists for this exact email, the profile becomes the linked Customer.
-- Customer is reachable ONLY through this path; sign-up stays disabled so only an Admin /
-- service-role process can create auth users at all.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare is_boot boolean; v_invite uuid; v_customer bigint;
begin
  perform pg_advisory_xact_lock(748213);
  is_boot := exists (select 1 from private.bootstrap_admins b where lower(b.email) = lower(new.email))
             and not exists (select 1 from public.profiles where role = 'Admin');

  if not is_boot then
    select i.id, i.customer_id into v_invite, v_customer
    from private.customer_invites i
    where lower(i.email) = lower(new.email) and i.consumed_at is null and i.expires_at > now()
    order by i.created_at desc limit 1
    for update;
  end if;

  if v_invite is not null then
    insert into public.profiles (id, email, name, role, status, customer_id)
    values (new.id, new.email,
            left(coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)), 120),
            'Customer', 'Active', v_customer);
    update private.customer_invites set consumed_at = now(), consumed_by = new.id where id = v_invite;
  else
    insert into public.profiles (id, email, name, role, status)
    values (new.id, new.email,
            left(coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)), 120),
            case when is_boot then 'Admin' else 'Viewer' end,
            case when is_boot then 'Active' else 'Inactive' end);
  end if;
  return new;
end $$;

-- Called ONLY by the invite-customer Edge Function (service role), which has already verified
-- the caller is an active Admin.
create or replace function public.create_customer_invite(p_customer_id bigint, p_email text, p_invited_by uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(btrim(p_email)); v_id uuid;
begin
  if v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(v_email) > 254 then
    raise exception 'Invalid email' using errcode = '22023';
  end if;
  if not exists (select 1 from public.customers where id = p_customer_id and status = 'Active') then
    raise exception 'Active customer not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.profiles where customer_id = p_customer_id) then
    raise exception 'This customer already has a portal account' using errcode = '23505';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'An account with this email already exists' using errcode = '23505';
  end if;
  -- a re-invite replaces the customer's earlier pending invite, and expired ones are cleaned up
  delete from private.customer_invites
   where consumed_at is null and (customer_id = p_customer_id or expires_at <= now());
  insert into private.customer_invites (customer_id, email, invited_by)
  values (p_customer_id, v_email, p_invited_by) returning id into v_id;
  return v_id;
end $$;

create or replace function public.revoke_customer_invite(p_invite_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from private.customer_invites where id = p_invite_id and consumed_at is null
$$;

revoke all on function public.create_customer_invite(bigint, text, uuid) from public, anon, authenticated;
revoke all on function public.revoke_customer_invite(uuid)                from public, anon, authenticated;
grant execute on function public.create_customer_invite(bigint, text, uuid) to service_role;
grant execute on function public.revoke_customer_invite(uuid)                to service_role;

commit;
