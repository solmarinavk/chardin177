import Link from "next/link";
import { IconoCandado } from "@/components/iconos";

// Página para usuarios logueados que no tienen el rol necesario (o aún no
// tienen perfil asignado). Vive fuera del grupo (app) para no recursar.
export default function SinAccesoPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
        <IconoCandado className="h-8 w-8" />
      </span>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Sin acceso
        </h1>
        <p className="mt-2 text-slate-600">
          Tu cuenta no tiene permiso para ver esta sección, o todavía no tiene un
          rol asignado. Si crees que es un error, avisa a la administración del
          edificio.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Link href="/inicio" className="btn-secondary w-full">
          Ir al inicio
        </Link>
        <form action="/auth/signout" method="post" className="w-full">
          <button type="submit" className="btn-primary w-full">
            Salir e ingresar con otra cuenta
          </button>
        </form>
      </div>
    </main>
  );
}
