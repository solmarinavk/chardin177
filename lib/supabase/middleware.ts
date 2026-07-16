import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

type CookieAEscribir = { name: string; value: string; options: CookieOptions };

// Rutas que NO requieren sesión. /api se protege por su cuenta (ej. CRON_SECRET).
const RUTAS_PUBLICAS = ["/", "/login", "/auth", "/api"];

function esRutaPublica(path: string): boolean {
  return RUTAS_PUBLICAS.some((r) => path === r || path.startsWith(`${r}/`));
}

// Refresca la sesión en cada request (necesario para @supabase/ssr) y protege
// las rutas privadas redirigiendo a /login si no hay usuario. La seguridad real
// vive en RLS; esto es solo la experiencia de usuario.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieAEscribir[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no metas lógica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && !esRutaPublica(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
