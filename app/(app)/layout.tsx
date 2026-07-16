import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { menuPara, nombreConRol } from "@/lib/roles";
import { NavSuperior, NavInferior, type NavItem } from "@/components/Nav";
import { IconoSalir } from "@/components/iconos";

// Layout de la zona autenticada. Exige sesión + perfil activo. Cabecera fija
// con marca y rol; pestañas arriba en pantalla grande y barra inferior tipo
// app en el celular.
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

  const itemsSuperior: NavItem[] = menuPara(perfil.rol).map((m) => ({
    href: m.href,
    etiqueta: m.etiqueta,
    icono: m.icono,
    activo: m.activo,
  }));
  const itemsInferior: NavItem[] = menuPara(perfil.rol).map((m) => ({
    href: m.href,
    etiqueta: m.corta,
    icono: m.icono,
    activo: m.activo,
  }));

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/inicio" className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-black tracking-tight text-white">
              177
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black leading-tight tracking-tight text-slate-900">
                Chardin 177
              </span>
              <span className="block truncate text-xs text-slate-500">
                {nombreConRol(perfil)}
              </span>
            </span>
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="btn-secondary min-h-[40px] px-3 py-2 text-sm"
            >
              <IconoSalir className="h-4 w-4" />
              Salir
            </button>
          </form>
        </div>
        <NavSuperior items={itemsSuperior} />
        <div
          aria-hidden
          className="h-0.5 bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-400"
        />
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:pb-12">
        {children}
      </div>

      <NavInferior items={itemsInferior} />
    </div>
  );
}
