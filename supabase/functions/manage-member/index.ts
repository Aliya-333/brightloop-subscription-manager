// Admin-only team management. Needs the service-role key, which Supabase injects into Edge
// Functions automatically — it must NEVER be shipped to the browser.
//   POST { action: "invite", email, name, role }   -> emails an invite, pre-sets role + Active
//   POST { action: "remove", id }                  -> deletes the auth user (profile cascades)
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const siteUrl = Deno.env.get("SITE_URL"); // optional: where invite links land

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const ROLES = ["Admin", "Staff", "Viewer"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not signed in" }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. who is calling?
  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !caller?.user) return json({ error: "Not signed in" }, 401);

  // 2. are they an active admin?
  const { data: me } = await admin.from("profiles").select("role,status").eq("id", caller.user.id).single();
  if (me?.role !== "Admin" || me?.status !== "Active") return json({ error: "Admins only" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  if (body.action === "invite") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim().slice(0, 120);
    const role = String(body.role ?? "");
    if (!EMAIL.test(email) || email.length > 254) return json({ error: "Invalid email" }, 400);
    if (!name) return json({ error: "Name is required" }, 400);
    if (!ROLES.includes(role)) return json({ error: "Invalid role" }, 400);

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name },
      redirectTo: siteUrl,
    });
    if (error || !data.user) return json({ error: error?.message ?? "Invite failed" }, 400);

    // role comes from here (server-side), never from user-editable metadata
    const { error: upErr } = await admin
      .from("profiles").update({ role, status: "Active", name }).eq("id", data.user.id);
    if (upErr) return json({ error: upErr.message }, 400);
    return json({ ok: true, id: data.user.id });
  }

  if (body.action === "remove") {
    const id = String(body.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid id" }, 400);
    if (id === caller.user.id) return json({ error: "You cannot remove yourself" }, 400);
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
