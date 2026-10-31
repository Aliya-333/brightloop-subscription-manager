-- Phase 1 / step 9 — dashboard totals computed inside PostgreSQL.
-- Returns the same four figures the dashboard cards show today, plus a few extras, as one JSON object.
-- SECURITY INVOKER: row-level security still applies; callers outside Admin/Staff/Viewer are refused.
-- Call: supabase.rpc('dashboard_stats')   (see README: the existing dashboard still uses row fetches
-- until its single query block is switched to this function — a frontend change, not made here.)
begin;

create or replace function public.dashboard_stats() returns jsonb
language plpgsql stable set search_path = '' as $$
begin
  if not private.is_member() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'active_subscriptions',     (select count(*) from public.subscriptions where status = 'Active'),
    'paid_invoice_amount',      (select coalesce(sum(amount), 0) from public.invoices where status = 'Paid'),
    'completed_payment_amount', (select coalesce(sum(amount), 0) from public.payments where status = 'Completed'),
    'overdue_invoices',         (select count(*) from public.invoices where status = 'Overdue'),
    'total_invoices',           (select count(*) from public.invoices),
    'unpaid_invoices',          (select count(*) from public.invoices where status in ('Draft','Confirmed')),
    'total_customers',          (select count(*) from public.customers),
    'generated_at',             now()
  );
end $$;

revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;

commit;
