/**
 * Leaderboard backend.
 * Default: localStorage (entries persist on this device only).
 * Upgrade: set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to use Supabase.
 *
 * Schema (Supabase `entries` table):
 *   id uuid primary key default gen_random_uuid(),
 *   name text not null,
 *   mode text not null,            -- 'face' | 'body' | 'combine'
 *   photo_url text,                -- base64 dataURL or storage URL
 *   body_photo_url text,           -- v2
 *   overall numeric not null,
 *   eyes numeric, skin numeric, jawline numeric, hair numeric,
 *   symmetry numeric, harmony numeric,
 *   frame numeric, vtaper numeric, posture numeric, proportions numeric,
 *   body_symmetry numeric, stance numeric, abs numeric, muscle_def numeric,
 *   created_at timestamptz default now(),
 *   ip_hash text
 *
 * RLS: enable. Public read, public insert (no auth). Rate-limit by IP via edge function (v2).
 */

export type Entry = {
  id: string;
  name: string;
  mode: "face" | "body" | "combine";
  photo_url: string | null;
  body_photo_url: string | null;
  overall: number;
  // face
  eyes?: number; skin?: number; jawline?: number;
  hair?: number; symmetry?: number; harmony?: number;
  // body (v2)
  frame?: number; vtaper?: number; posture?: number; proportions?: number;
  body_symmetry?: number; stance?: number; abs?: number; muscle_def?: number;
  created_at: string;
};

export type Filter = "all" | "week" | "today";

export interface Backend {
  mode: "local" | "public";
  /** Insert a new entry; returns inserted entry (with id + created_at). */
  submit(entry: Omit<Entry, "id" | "created_at">): Promise<Entry>;
  /** Top 100 by overall, optionally filtered. */
  top(modeFilter: Entry["mode"], filter: Filter): Promise<Entry[]>;
}

/* ─────────────────────────────────────────────
   LOCAL BACKEND
   ───────────────────────────────────────────── */
function LocalBackend(): Backend {
  const KEY = "mogscore.entries.v3";
  function read(): Entry[] {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }
  function write(rows: Entry[]) {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 1000)));
  }

  return {
    mode: "local",
    async submit(e) {
      const entry: Entry = {
        ...e,
        id: "local-" + Math.random().toString(36).slice(2, 11),
        created_at: new Date().toISOString(),
      };
      const rows = read();
      rows.push(entry);
      rows.sort((a, b) => b.overall - a.overall);
      write(rows);
      return entry;
    },
    async top(modeFilter, filter) {
      let rows = read().filter((r) => r.mode === modeFilter);
      const now = Date.now();
      if (filter === "today") {
        rows = rows.filter((r) => now - new Date(r.created_at).getTime() < 24 * 3600 * 1000);
      } else if (filter === "week") {
        rows = rows.filter((r) => now - new Date(r.created_at).getTime() < 7 * 24 * 3600 * 1000);
      }
      rows.sort((a, b) => b.overall - a.overall);
      return rows.slice(0, 100);
    },
  };
}

/* ─────────────────────────────────────────────
   SUPABASE BACKEND (lazy-loaded)
   ───────────────────────────────────────────── */
async function SupabaseBackend(url: string, key: string): Promise<Backend> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key);

  return {
    mode: "public",
    async submit(e) {
      const { data, error } = await supabase
        .from("entries")
        .insert([e])
        .select()
        .single();
      if (error) throw error;
      return data as Entry;
    },
    async top(modeFilter, filter) {
      let q = supabase
        .from("entries")
        .select("*")
        .eq("mode", modeFilter)
        .order("overall", { ascending: false })
        .limit(100);
      if (filter === "today") {
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        q = q.gte("created_at", since);
      } else if (filter === "week") {
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        q = q.gte("created_at", since);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as Entry[]) ?? [];
    },
  };
}

let backendPromise: Promise<Backend> | null = null;
export function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = (async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        try { return await SupabaseBackend(url, key); }
        catch (e) { console.warn("[mogscore] Supabase init failed; falling back to local", e); }
      }
      return LocalBackend();
    })();
  }
  return backendPromise;
}
