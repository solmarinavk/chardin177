import type { Metadata } from "next";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import { getPerfiles } from "@/lib/usuarios";
import {
  getBitacora,
  resumenAuditoria,
  TABLAS_AUDITADAS,
  type FiltroBitacora,
} from "@/lib/bitacora";
import { formatoFechaHora } from "@/lib/fechas";

export const metadata: Metadata = { title: "Bitácora" };

const ACCIONES = [
  { valor: "INSERT", texto: "Creación" },
  { valor: "UPDATE", texto: "Cambio" },
  { valor: "DELETE", texto: "Eliminación" },
];

const ESTILO_ACCION: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-800",
  UPDATE: "bg-amber-100 text-amber-800",
  DELETE: "bg-red-100 text-red-800",
};

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: { tabla?: string; accion?: string; desde?: string; hasta?: string };
}) {
  await requireRol(["admin"]);

  const filtro: FiltroBitacora = {
    tabla: searchParams.tabla || null,
    accion: searchParams.accion || null,
    desde: searchParams.desde || null,
    hasta: searchParams.hasta || null,
  };

  const [entradas, perfiles] = await Promise.all([getBitacora(filtro), getPerfiles()]);
  const nombrePorUser = new Map(perfiles.map((p) => [p.user_id, p.nombre]));

  function quien(uuid: string | null): string {
    if (!uuid) return "Sistema";
    return nombrePorUser.get(uuid) ?? `Usuario ${uuid.slice(0, 8)}…`;
  }

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
          Bitácora
        </h1>
        <p className="mt-1 text-slate-600">
          Cada cambio sensible queda registrado: quién, qué y cuándo. No se puede
          editar ni borrar.
        </p>
      </div>

      {/* Filtros (GET) */}
      <form
        method="get"
        className="card animar-aparecer flex flex-col gap-3 p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Módulo</span>
            <select name="tabla" defaultValue={filtro.tabla ?? ""} className="campo">
              <option value="">Todos</option>
              {TABLAS_AUDITADAS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Acción</span>
            <select name="accion" defaultValue={filtro.accion ?? ""} className="campo">
              <option value="">Todas</option>
              {ACCIONES.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.texto}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Desde</span>
            <input type="date" name="desde" defaultValue={filtro.desde ?? ""} className="campo" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Hasta</span>
            <input type="date" name="hasta" defaultValue={filtro.hasta ?? ""} className="campo" />
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1">
            Filtrar
          </button>
          <Link href="/bitacora" className="btn-secondary px-4">
            Limpiar
          </Link>
        </div>
      </form>

      {entradas.length === 0 ? (
        <section className="card animar-aparecer p-6 text-center text-slate-600">
          No hay movimientos para esos filtros.
        </section>
      ) : (
        <section className="animar-aparecer flex flex-col gap-2">
          <p className="text-xs text-slate-500">
            {entradas.length} movimiento{entradas.length === 1 ? "" : "s"} (máx.
            200, del más reciente al más antiguo)
          </p>
          {entradas.map((e) => (
            <article key={e.id} className="card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {resumenAuditoria(e)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {quien(e.usuario)} · reg. {e.registro_id}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`chip ${ESTILO_ACCION[e.accion] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {e.accion}
                  </span>
                  <span className="num text-[11px] text-slate-400">
                    {formatoFechaHora(e.creado_en)}
                  </span>
                </div>
              </div>
              {(e.antes || e.despues) && (
                <details className="group mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">
                    Ver detalle
                  </summary>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {e.antes != null && (
                      <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                        antes: {JSON.stringify(e.antes, null, 1)}
                      </pre>
                    )}
                    {e.despues != null && (
                      <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                        después: {JSON.stringify(e.despues, null, 1)}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
