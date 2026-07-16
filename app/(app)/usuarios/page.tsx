import type { Metadata } from "next";
import Link from "next/link";
import { requireRol, ETIQUETA_ROL } from "@/lib/roles";
import { getPerfiles, getResidentes } from "@/lib/usuarios";
import { getDepartamentos } from "@/lib/periodos";
import { IconoFlecha } from "@/components/iconos";
import {
  FormCambiarRol,
  FormAlternarActivo,
  FormResidente,
  FormAlternarResidente,
} from "@/components/forms/usuario";
import {
  cambiarRol,
  alternarActivo,
  guardarResidente,
  alternarResidente,
} from "./acciones";

export const metadata: Metadata = { title: "Usuarios y roles" };

export default async function UsuariosPage() {
  await requireRol(["admin"]);

  const [perfiles, residentes, departamentos] = await Promise.all([
    getPerfiles(),
    getResidentes(),
    getDepartamentos(),
  ]);
  const dptos = departamentos.map((d) => d.id);

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer">
        <Link
          href="/administracion"
          className="text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Administración
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Usuarios y roles
        </h1>
        <p className="mt-1 text-slate-600">
          Quién entra al sistema y con qué rol (traspaso de cargo), y el padrón
          de residentes para los avisos.
        </p>
      </div>

      {/* ——— Usuarios con login ——— */}
      <section className="card animar-aparecer p-5">
        <h2 className="titulo-seccion mb-3">Usuarios con acceso</h2>
        <ul className="flex flex-col gap-4">
          {perfiles.map((p) => (
            <li
              key={p.user_id}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{p.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {ETIQUETA_ROL[p.rol]}
                    {!p.activo && (
                      <span className="ml-1 text-red-600">· inactivo</span>
                    )}
                  </p>
                </div>
                <FormAlternarActivo
                  accion={alternarActivo}
                  userId={p.user_id}
                  activo={p.activo}
                />
              </div>
              <div className="mt-3">
                <FormCambiarRol
                  accion={cambiarRol}
                  userId={p.user_id}
                  rolActual={p.rol}
                  nombre={p.nombre}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Para crear un usuario nuevo, agrégalo primero en Supabase →
          Authentication → Users y corre <code>npm run seed:perfiles</code>. Aquí
          se cambian roles y se activa/desactiva el acceso.
        </p>
      </section>

      {/* ——— Padrón de residentes ——— */}
      <section className="card animar-aparecer p-5">
        <h2 className="titulo-seccion mb-3">Padrón de residentes</h2>

        <details className="group mb-4">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
            <IconoFlecha className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
            Agregar residente
          </summary>
          <div className="mt-3 rounded-xl border border-slate-200 p-3">
            <FormResidente accion={guardarResidente} dptos={dptos} />
          </div>
        </details>

        {residentes.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay residentes en el padrón.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {residentes.map((r) => (
              <li
                key={r.id}
                className={`rounded-xl border border-slate-200 p-3 ${
                  r.activo ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      <span className="num">{r.dpto_id}</span> · {r.nombre}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.es_propietario ? "Propietario" : "Inquilino"}
                      {r.email && <> · {r.email}</>}
                      {!r.activo && <span className="text-red-600"> · baja</span>}
                    </p>
                  </div>
                  <FormAlternarResidente
                    accion={alternarResidente}
                    id={r.id}
                    activo={r.activo}
                  />
                </div>
                <details className="group mt-2">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
                    <IconoFlecha className="h-3 w-3 transition-transform group-open:rotate-90" />
                    Editar
                  </summary>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <FormResidente
                      accion={guardarResidente}
                      dptos={dptos}
                      residente={{
                        id: r.id,
                        dpto_id: r.dpto_id,
                        nombre: r.nombre,
                        email: r.email,
                        telefono: r.telefono,
                        es_propietario: r.es_propietario,
                      }}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
