-- Fix: lpad(n::text, 3, '0') TRUNCATES numbers longer than 3 digits (lpad('1000',3,'0') = '100'),
-- so the 1000th SUB-/INV-/PAY-/QUO- code collided with the 100th. a CASE only pads numbers below 1000.
begin;
create or replace function private.assign_code() returns trigger
language plpgsql security definer set search_path = '' as $$
declare prefix text := tg_argv[0]; seq regclass := tg_argv[1]::regclass; col text := tg_argv[2];
        code text;
begin
  code := prefix || '-' || to_char(now(), 'YYYY') || '-' || (select case when n < 1000 then lpad(n::text, 3, '0') else n::text end from (select nextval(seq) as n) q);
  if col = 'id' then new.id := code; else new.payment_id := code; end if;
  return new;
end $$;
create or replace function private.assign_quote_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.quote_number := 'QUO-' || to_char(now(), 'YYYY') || '-' || (select case when n < 1000 then lpad(n::text, 3, '0') else n::text end from (select nextval('private.quotation_seq') as n) q);
  return new;
end $$;
commit;
