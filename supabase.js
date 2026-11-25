import { createClient } from "@supabase/supabase-js";

/**
 * وصلني الطائف — Supabase browser client.
 * هذه بيانات اتصال عامة (publishable/anon key) مصممة للاستخدام في المتصفح.
 * لا تضع service_role أو أي مفتاح سري في هذا الملف.
 * أمان العمليات الخاصة يعتمد على RLS المرفق في supabase/schema.sql.
 */
export const SUPABASE_URL = "https://ubjzxnkrqavwxywhtmof.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_nxIC__PmNk_wrfI-PBr88Q_-DWZTgxo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
