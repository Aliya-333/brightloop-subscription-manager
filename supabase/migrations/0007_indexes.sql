-- Phase 1 / step 5 — indexes for the new foreign keys and the frequent filters/sorts.
-- (profiles.customer_id already has a unique index; product_variants(product_id) is covered by the
-- unique (product_id, variant_name) constraint.) Tables are small, so plain CREATE INDEX is fine.
begin;

create index if not exists subscriptions_customer_id_idx on public.subscriptions (customer_id) where customer_id is not null;
create index if not exists subscriptions_plan_id_idx     on public.subscriptions (plan_id)     where plan_id is not null;
create index if not exists subscriptions_status_idx      on public.subscriptions (status);
create index if not exists subscriptions_created_at_idx  on public.subscriptions (created_at desc);

create index if not exists invoices_customer_id_idx      on public.invoices (customer_id)     where customer_id is not null;
create index if not exists invoices_subscription_id_idx  on public.invoices (subscription_id) where subscription_id is not null;
create index if not exists invoices_status_due_date_idx  on public.invoices (status, due_date);   -- overdue / unpaid lookups
create index if not exists invoices_created_at_idx       on public.invoices (created_at desc);

create index if not exists payments_customer_id_idx      on public.payments (customer_id) where customer_id is not null;
create index if not exists payments_invoice_id_idx       on public.payments (invoice_id)  where invoice_id is not null;
create index if not exists payments_status_idx           on public.payments (status);
create index if not exists payments_created_at_idx       on public.payments (created_at desc);

create index if not exists subscription_items_subscription_id_idx on public.subscription_items (subscription_id);
create index if not exists subscription_items_product_id_idx      on public.subscription_items (product_id);
create index if not exists subscription_items_variant_id_idx      on public.subscription_items (variant_id) where variant_id is not null;

create index if not exists invoice_items_invoice_id_idx  on public.invoice_items (invoice_id);
create index if not exists invoice_items_product_id_idx  on public.invoice_items (product_id) where product_id is not null;
create index if not exists invoice_items_variant_id_idx  on public.invoice_items (variant_id) where variant_id is not null;

create index if not exists quotations_customer_id_idx    on public.quotations (customer_id);
create index if not exists quotations_status_idx         on public.quotations (status);
create index if not exists quotations_created_at_idx     on public.quotations (created_at desc);
create index if not exists quotation_items_quotation_id_idx on public.quotation_items (quotation_id);
create index if not exists quotation_items_product_id_idx   on public.quotation_items (product_id) where product_id is not null;
create index if not exists quotation_items_variant_id_idx   on public.quotation_items (variant_id) where variant_id is not null;
create index if not exists quotations_template_id_idx    on public.quotations (template_id) where template_id is not null;

commit;
