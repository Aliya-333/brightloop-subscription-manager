# Brightloop Subscription Manager

React + Vite frontend with a Supabase backend (Postgres, Auth, Edge Functions).

## Backend setup (one time)

1. **Run the schema** — Supabase Dashboard → SQL Editor → paste and run
   `supabase/migrations/0001_init.sql`. (With the Supabase CLI, `supabase db push` applies every file
   in order.) The Phase 1 migrations `0003`–`0008` are run **after** step 2 below, in order.
2. **Name your first admin** — edit the email in `supabase/migrations/0002_bootstrap_admin.sql`
   to the address you will log in with, then run it.
3. **Create that user** — Dashboard → Authentication → Users → *Add user* (set a strong password,
   tick *Auto Confirm*). It becomes the first **Admin** automatically.
4. **Lock down sign-ups** — Authentication → Sign In / Providers → turn **off** "Allow new users to
   sign up". Set minimum password length to 10 and keep "Confirm email" on.
   (Authentication → URL Configuration: set *Site URL* to your deployed URL.)
5. **Deploy the invite function** (needed for the Team page):
   ```bash
   npx supabase login
   npx supabase link --project-ref wmmmbahpithwzsyccjpi
   npx supabase functions deploy manage-member
   npx supabase functions deploy invite-customer   # customer portal invitations (Admin only)
   npx supabase secrets set SITE_URL=https://your-site ALLOWED_ORIGIN=https://your-site
   ```
6. `cp .env.example .env.local` and fill in the two variables below (already done for this project),
   then `npm install && npm run dev`.
7. Run migrations `0003` … `0009` (customer role, relationships, new tables, customer RLS, indexes,
   dashboard function, document-number padding fix), then `supabase/tests/phase1_tests.sql` on a scratch database to verify.

## Environment variables
The frontend reads exactly these two (see `src/lib/supabase.ts` and `.env.example`):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the project's publishable key (`sb_publishable_…`) — the same thing older docs call the *anon* key |

`VITE_SUPABASE_ANON_KEY` is **not** used anywhere. Never put the `service_role` / secret key in a
`VITE_` variable: it is only available inside Edge Functions, injected by Supabase.

## Security model

| Layer | What it does |
|---|---|
| Keys | Browser only ever has the publishable/anon key. The service-role key lives only inside the Edge Function (injected by Supabase). |
| RLS | Enabled on every table; `anon` has no access at all. |
| Roles | `Admin`: everything. `Staff`: read + create + edit. `Viewer`: read only. `Customer`: read-only access to **its own** customer, subscriptions (+items), non-draft invoices (+items), payments and non-draft quotations — nothing else. `Inactive` users: nothing. Only admins can delete. |
| Customer identity | `profiles.customer_id` (unique, server-written only). Policies derive the customer from `auth.uid()`; no client value is ever trusted. |
| Customer invites | Admin calls the `invite-customer` Edge Function → pending invite bound to customer + email → DB trigger links the new auth user. Sign-up stays disabled; staff invites (`manage-member`) cannot create Customers. |
| Escalation | A trigger stops anyone but an admin changing `role`, `status` or `email`; the last active admin can't be demoted/deleted. |
| Invites | Admin-only Edge Function; role is set server-side (never from user-editable metadata). |
| Integrity | `SUB-/INV-/PAY-` codes are assigned and locked by the database; CHECK constraints on amounts, dates, enums, lengths; unique customer email and discount code. |
| New accounts | Start `Inactive` and see an "Access pending" screen until an admin activates them. |

## Known limits / next steps
- Subscriptions, invoices and payments now also carry real FK columns (`customer_id`, `plan_id`,
  `subscription_id`, `invoice_id`), filled by triggers from the text the UI still writes. Rows that could
  not be matched are listed by `select * from private.link_audit;` — nothing was guessed.
- Dashboard totals: `select public.dashboard_stats()` (RPC) is exact at any size, but the current
  dashboard still sums fetched rows (API cap: 1,000). Switching it to the RPC needs a small frontend change.
- Password recovery: the recovery link signs the user in, but Settings → Security always asks for the
  current password (client-side check). That needs a small frontend change; it cannot be fixed in the backend.
- There is no customer-facing UI yet: Customers can sign in and the API returns only their data, but the
  existing screens are the staff app.
- Reports page and the dashboard charts/activity feed still show sample data; the four dashboard
  stat cards are live.
- Two-factor toggle is disabled until Supabase MFA enrolment is built.
