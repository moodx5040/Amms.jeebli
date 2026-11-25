import type { SupabaseClient } from "@supabase/supabase-js";
// Keep the user's requested browser connection in client/src/supabase.js.
// @ts-ignore — Vite consumes this JavaScript module directly; its public config is intentionally plain JS.
import { supabase as rawClient } from "../supabase.js";

export const supabase = rawClient as SupabaseClient<any>;
