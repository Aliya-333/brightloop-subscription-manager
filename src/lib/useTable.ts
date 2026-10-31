import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

type Row = Record<string, unknown>;

const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

// DB -> UI: snake_case keys, null -> "" so the existing forms keep working
function fromDb<T>(row: Row): T {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v === null ? "" : v;
  return out as T;
}

// UI -> DB: camelCase -> snake_case, "" -> null for optional dates; drop fields the
// server owns (ids/codes/timestamps) so the client can never set them.
const SERVER_OWNED = new Set(["id", "paymentId", "createdAt", "updatedAt", "createdBy"]);
function toDb(data: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(data)) {
    if (SERVER_OWNED.has(k)) continue;
    const isDate = k.endsWith("Date") || k === "joined";
    out[toSnake(k)] = isDate && v === "" ? null : v;
  }
  return out;
}

export function errorMessage(e: { message: string; code?: string }): string {
  if (e.code === "42501" || /row-level security|permission denied/i.test(e.message))
    return "You don't have permission to do that.";
  if (e.code === "23505") return "That value already exists (duplicate).";
  if (e.code === "23514") return "One of the values is not allowed. Please check the form.";
  return e.message;
}

/**
 * Loads a table and exposes insert/update/remove that keep local state in sync with the
 * database. Returned rows are the server's truth (codes, timestamps), not the client's guess.
 */
export function useTable<T extends { id: number | string }>(table: string, orderBy = "id") {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from(table)
      .select("*")
      .order(orderBy, { ascending: false });
    if (err) setError(errorMessage(err));
    else {
      setError("");
      setRows((data as Row[]).map((r) => fromDb<T>(r)));
    }
    setLoading(false);
  }, [table, orderBy]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const insert = async (data: Partial<Omit<T, "id">>): Promise<{ row?: T; error?: string }> => {
    const { data: res, error: err } = await supabase
      .from(table).insert(toDb(data as Row)).select().single();
    if (err) return { error: errorMessage(err) };
    const row = fromDb<T>(res as Row);
    setRows((p) => [row, ...p]);
    return { row };
  };

  const update = async (id: T["id"], data: Partial<Omit<T, "id">>): Promise<{ row?: T; error?: string }> => {
    const { data: res, error: err } = await supabase
      .from(table).update(toDb(data as Row)).eq("id", id).select();
    if (err) return { error: errorMessage(err) };
    if (!res || res.length === 0) return { error: "You don't have permission to do that." };
    const row = fromDb<T>(res[0] as Row);
    setRows((p) => p.map((r) => (r.id === id ? row : r)));
    return { row };
  };

  const remove = async (id: T["id"]): Promise<{ error?: string }> => {
    const { data: res, error: err } = await supabase.from(table).delete().eq("id", id).select();
    if (err) return { error: errorMessage(err) };
    if (!res || res.length === 0) return { error: "Only administrators can delete records." };
    setRows((p) => p.filter((r) => r.id !== id));
    return {};
  };

  return { rows, loading, error, reload: load, insert, update, remove };
}
