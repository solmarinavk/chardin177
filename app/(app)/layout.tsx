import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_ROL, menuPara } from "@/lib/roles";

// Layout de la zona autenticada. Exige sesión + perfil activo. Muestra el
// nombre, el rol y el menú que corresponde a ese rol.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!perfil || !perfil.activo) redirect("/sin-acceso");

  const items = menuPara(perfil.rol);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-black leading-tight tracking-tight text-slate-900">
              Chardin 177
            </p>
            <p className="truncate text-xs text-slate-500">
              {perfil.nombre} · {ETIQUETA_ROL[perfil.rol]}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="btn-secondary min-h-[40px] px-3 py-2 text-sm"
            >
              Salir
            </button>
          </form>
        </div>

        <nav className="mx-auto max-w-3xl overflow-x-auto px-2 pb-2">
          <ul className="flex gap-1 whitespace-nowrap text-sm">
            {items.map((item) => (
              <li key={item.href}>
                {item.activo ? (
                  <Link
                    href={item.href}
                    className="inline-block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {item.etiqueta}
                  </Link>
                ) : (
                  <span
                    className="inline-block rounded-lg px-3 py-2 text-slate-400"
                    title="Próximamente"
                  >
                    {item.etiqueta}
                    <span className="ml-1 text-[10px] uppercase tracking-wide">
                      pronto
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
