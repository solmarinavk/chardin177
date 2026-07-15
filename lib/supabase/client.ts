import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// Cliente de Supabase para componentes de cliente (navegador).
// Usa la anon key: la seguridad real la impone RLS en la base de datos.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
