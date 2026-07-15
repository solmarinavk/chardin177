import { getPerfil, ETIQUETA_ROL } from "@/lib/roles";
import type { RolUsuario } from "@/lib/database.types";

// Qué puede hacer cada rol (texto de orientación para el usuario).
const QUE_HACES: Record<RolUsuario, string[]> = {
  admin: [
    "Configurar cuotas fijas y residentes",
    "Emitir y cerrar los periodos mensuales",
    "Gestionar usuarios y roles",
    "Ver toda la información del edificio",
  ],
  tesoreria: [
    "Subir los recibos de agua y luz",
    "Registrar pagos y egresos con comprobante",
    "Emitir el periodo y cerrar el mes",
    "Generar conciliaciones de agua",
  ],
  porteria: [
    "Ingresar las 10 lecturas de agua del mes",
    "Adjuntar la foto del medidor (opcional)",
  ],
  residente: [
    "Ver tu estado de cuenta",
    "Ver el semáforo de quién pagó",
    "Ver los gastos del edificio y sus comprobantes",
  ],
};

export default async function InicioPage() {
  const perfil = await getPerfil();
  // El layout ya garantiza que hay perfil; esto es solo por seguridad de tipos.
  if (!perfil) return null;

  const tareas = QUE_HACES[perfil.rol];

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hola, {perfil.nombre}
        </h1>
        <p className="mt-1 text-slate-600">
          Tu rol es{" "}
          <span className="font-semibold">{ETIQUETA_ROL[perfil.rol]}</span>.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Lo que puedes hacer
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {tareas.map((t) => (
            <li key={t} className="flex items-start gap-2 text-slate-800">
              <span aria-hidden className="mt-1 text-slate-400">
                •
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-slate-500">
        Los módulos marcados como <span className="font-medium">pronto</span> en
        el menú se irán activando fase por fase.
      </p>
    </main>
  );
}
