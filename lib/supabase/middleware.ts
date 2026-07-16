import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

type CookieAEscribir = { name: string; value: string; options: CookieOptions };

// Rutas que NO requieren sesión. /api se protege por su cuenta (ej. CRON_SECRET).
// /transparencia es la web pública del edificio (solo lectura, rol anon en RLS).
const RUTAS_PUBLICAS = ["/", "/login", "/auth", "/api", "/transparencia"];

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

  // La página pública muestra pagos EN VIVO (es el corazón de la cobranza):
  // prohibimos toda caché de su HTML, incluida la CDN de Netlify, que llegó a
  // servirla congelada con los datos del deploy. `Netlify-CDN-Cache-Control`
  // es la cabecera que la CDN de Netlify respeta por encima de todo.
  if (path === "/transparencia" || path.startsWith("/transparencia/")) {
    supabaseResponse.headers.set("Cache-Control", "no-store, must-revalidate");
    supabaseResponse.headers.set("CDN-Cache-Control", "no-store");
    supabaseResponse.headers.set("Netlify-CDN-Cache-Control", "no-store");
  }

  return supabaseResponse;
}
