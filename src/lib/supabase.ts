import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client using the service-role key. The browser never talks to
// Supabase directly, so no row-level security policies are needed.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see .env.example)");
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
