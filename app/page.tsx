import Link from "next/link";
import { IconoGota, IconoCheck, IconoRecibo, IconoFlecha } from "@/components/iconos";

// Portada pública. En la Fase 2 se convierte en el dashboard de transparencia.
export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-white via-slate-50 to-slate-200">
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 py-14 text-center">
        <div className="animar-aparecer">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-lg">
            177
          </span>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-slate-900">
            Chardin 177
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            La administración del edificio, clara y al día: quién pagó, en qué se
            gasta y cuánto hay en caja.
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <Link
            href="/transparencia"
            className="btn-primary w-full animar-aparecer"
          >
            Ver las cuentas del edificio
            <IconoFlecha className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="animar-aparecer text-sm font-semibold text-slate-400 hover:text-slate-700"
          >
            Ingresar (administración)
          </Link>
        </div>

        <ul
          className="animar-aparecer flex w-full flex-col gap-3 text-left"
          style={{ animationDelay: "100ms" }}
        >
          <li className="card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <IconoGota className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-700">
              <span className="font-bold">El sistema calcula solo</span> la cuota
              de cada departamento a partir de las lecturas de agua.
            </p>
          </li>
          <li className="card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <IconoCheck className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-700">
              <span className="font-bold">Semáforo de pagos</span> en tiempo real:
              verde pagó, ámbar parcial, rojo pendiente.
            </p>
          </li>
          <li className="card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <IconoRecibo className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-700">
              <span className="font-bold">Todo documentado</span>: cada gasto
              con su comprobante y toda la historia guardada.
            </p>
          </li>
        </ul>
      </section>

      <footer className="pb-8 text-center text-sm text-slate-400">
        Barranco, Lima · 10 departamentos
      </footer>
    </main>
  );
}
