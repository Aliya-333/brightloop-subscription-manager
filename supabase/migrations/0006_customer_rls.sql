-- Phase 1 / step 4 — Customer-level Row Level Security (READ ONLY).
-- Identity always comes from private.customer_id(), which is derived from auth.uid() + profiles.
-- Nothing a client sends can change which customer a request acts as.
-- Customers get SELECT policies only. They have no INSERT/UPDATE/DELETE policy on any table, and the
-- staff write policies use can_write()/is_admin(), which are false for the Customer role.
-- Customers get no policy on products, plans, discounts, product_variants, quotation_templates,
-- workspace_settings or other profiles (internal data; products/variants carry cost prices).
-- Draft invoices and draft quotations are internal and are not shown to customers.
begin;

create policy customers_self_select on public.customers for select to authenticated
  using (id = (select private.customer_id()));

create policy subscriptions_customer_select on public.subscriptions for select to authenticated
  using (customer_id = (select private.customer_id()));

create policy subscription_items_customer_select on public.subscription_items for select to authenticated
  using (subscription_id in (
    select s.id from public.subscriptions s where s.customer_id = (select private.customer_id())));

create policy invoices_customer_select on public.invoices for select to authenticated
  using (customer_id = (select private.customer_id()) and status <> 'Draft');

create policy invoice_items_customer_select on public.invoice_items for select to authenticated
  using (invoice_id in (
    select i.id from public.invoices i
    where i.customer_id = (select private.customer_id()) and i.status <> 'Draft'));

create policy payments_customer_select on public.payments for select to authenticated
  using (customer_id = (select private.customer_id()));

create policy quotations_customer_select on public.quotations for select to authenticated
  using (customer_id = (select private.customer_id()) and status <> 'Draft');

create policy quotation_items_customer_select on public.quotation_items for select to authenticated
  using (quotation_id in (
    select q.id from public.quotations q
    where q.customer_id = (select private.customer_id()) and q.status <> 'Draft'));

commit;
