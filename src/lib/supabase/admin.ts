import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a service_role key — ignora RLS. Uso restrito a
 * código server-only (healthcheck, provisionamento administrativo). O
 * import "server-only" faz o build falhar se isto for importado por
 * engano num Client Component.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
