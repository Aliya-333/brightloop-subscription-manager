// Admin-only customer onboarding. Needs the service-role key, which Supabase injects into Edge
// Functions automatically — it must NEVER be shipped to the browser.
//   POST { customer_id: number, email?: string }
//     -> records a pending invite bound to that customer + email, then emails an invite link.
// The profile (role = Customer, customer_id) is created by the database trigger when the auth user
// is created; the browser never supplies a role or a customer id that is trusted for access.
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const siteUrl = Deno.env.get("SITE_URL");

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not signed in" }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !caller?.user) return json({ error: "Not signed in" }, 401);

  const { data: me } = await admin.from("profiles").select("role,status").eq("id", caller.user.id).single();
  if (me?.role !== "Admin" || me?.status !== "Active") return json({ error: "Admins only" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const customerId = Number(body.customer_id);
  if (!Number.isSafeInteger(customerId) || customerId <= 0) return json({ error: "Invalid customer_id" }, 400);

  const { data: customer } = await admin
    .from("customers").select("id,name,email").eq("id", customerId).maybeSingle();
  if (!customer) return json({ error: "Customer not found" }, 404);

  const email = String(body.email ?? customer.email).trim().toLowerCase();

  // 1. validate + store the invite (rejects duplicates / already-linked customers / existing accounts)
  const { data: inviteId, error: invErr } = await admin.rpc("create_customer_invite", {
    p_customer_id: customer.id, p_email: email, p_invited_by: caller.user.id,
  });
  if (invErr || !inviteId) return json({ error: invErr?.message ?? "Invite failed" }, 400);

  // 2. create the auth user + email the link; the DB trigger links it to the customer
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name: customer.name },
    redirectTo: siteUrl,
  });
  if (error || !data.user) {
    await admin.rpc("revoke_customer_invite", { p_invite_id: inviteId });
    return json({ error: error?.message ?? "Invite failed" }, 400);
  }
  return json({ ok: true, id: data.user.id });
});
