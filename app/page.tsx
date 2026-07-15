import Link from "next/link";

// Página pública provisional (Fase 0). En la Fase 2 se convierte en el
// dashboard de transparencia del edificio.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Edificio
        </p>
        <h1 className="mt-1 text-5xl font-black tracking-tight text-slate-900">
          Chardin 177
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Administración, tesorería y transparencia del edificio.
          <br />
          Próximamente.
        </p>
      </div>

      <Link href="/login" className="btn-primary w-full max-w-xs">
        Ingresar
      </Link>

      <p className="text-sm text-slate-400">Barranco, Lima · 10 departamentos</p>
    </main>
  );
}
