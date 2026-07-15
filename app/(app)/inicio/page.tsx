import { createClient } from "@/lib/supabase/server";

// Página de inicio de la zona autenticada. En 0.5 mostrará el rol y el menú.
export default async function InicioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Bienvenido</h1>
      <p className="text-slate-600">
        Ingresaste como <span className="font-semibold">{user?.email}</span>.
      </p>
      <p className="text-sm text-slate-500">
        Esta es la base de la plataforma. Los módulos se irán activando fase por fase.
      </p>
    </main>
  );
}
