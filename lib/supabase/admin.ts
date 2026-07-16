import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Cliente con service role para procesos sin sesión de usuario (ej. el cron de
// recordatorios). SOLO servidor. NUNCA se importa desde un componente de cliente.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
