import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Cliente ANÓNIMO (sin sesión) para la vista pública de transparencia.
//
// No lee cookies: SIEMPRE opera con el rol `anon`, así que las políticas RLS
// `pub_*` (migración 0008) son la única puerta. Ventajas:
//   · La página se ve IGUAL para todos (con o sin login) → lo que ve un admin
//     al probar es exactamente lo que ve el público.
//   · Si una tabla no tuviera política anon, saldría vacía aquí y lo notamos,
//     en vez de "funciona para el admin pero el vecino ve en blanco".
//   · No puede escribir nada (solo la anon key, sin JWT de un rol con permisos).
//
// SOLO servidor. NUNCA se importa desde un componente de cliente.
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
