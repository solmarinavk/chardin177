import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Layout de la zona autenticada. Exige sesión; si no hay, manda al login.
// (En la tarea 0.5 se añade la lógica de roles.)
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span className="text-lg font-black tracking-tight text-slate-900">
            Chardin 177
          </span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-secondary min-h-[40px] px-3 py-2 text-sm">
              Salir
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
