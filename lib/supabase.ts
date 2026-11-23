import { createClient } from "@supabase/supabase-js";

// Same placeholder rule as api/supabaseClient.js: a missing URL must not crash
// `next build` while CI prerenders pages that import this module.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
