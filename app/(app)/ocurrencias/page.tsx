import type { Metadata } from "next";
import { requireRol } from "@/lib/roles";
import { getOcurrencias, etiquetaCategoria } from "@/lib/ocurrencias";
import { FormOcurrencia } from "@/components/forms/ocurrencia";
import { IconoDescarga } from "@/components/iconos";
import { registrarOcurrencia } from "./acciones";

export const metadata: Metadata = { title: "Cuaderno de ocurrencias" };

// Fecha de hoy en Lima como YYYY-MM-DD (en-CA da formato ISO).
function hoyLima(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

export default async function OcurrenciasPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string };
}) {
  await requireRol(["porteria", "tesoreria", "admin"]);

  const desde = searchParams.desde?.match(/^\d{4}-\d{2}-\d{2}$/) ? searchParams.desde : undefined;
  const hasta = searchParams.hasta?.match(/^\d{4}-\d{2}-\d{2}$/) ? searchParams.hasta : undefined;

  const ocurrencias = await getOcurrencias({ desde, hasta });
  const hoy = hoyLima();

  const qs = new URLSearchParams();
  if (desde) qs.set("desde", desde);
  if (hasta) qs.set("hasta", hasta);
  const pdfHref = `/ocurrencias/pdf${qs.toString() ? `?${qs.toString()}` : ""}`;

  return (
    <main className="flex flex-col gap-4">
      <div className="animar-aparecer">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Cuaderno de ocurrencias
        </h1>
        <p className="mt-1 text-slate-600">
          Registra lo que pasa en el edificio (mantenimientos, incidencias, entregas…) con
          sus fotos de evidencia. Es un registro interno del edificio.
        </p>
      </div>

      <FormOcurrencia accion={registrarOcurrencia} hoy={hoy} />

      {/* Filtro + descarga */}
      <section className="card animar-aparecer p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="desde" className="etiqueta">
              Desde
            </label>
            <input id="desde" name="desde" type="date" defaultValue={desde} max={hoy} className="campo" />
          </div>
          <div>
            <label htmlFor="hasta" className="etiqueta">
              Hasta
            </label>
            <input id="hasta" name="hasta" type="date" defaultValue={hasta} max={hoy} className="campo" />
          </div>
          <button type="submit" className="btn-secondary">
            Filtrar
          </button>
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="btn-primary ml-auto inline-flex items-center gap-2"
          >
            <IconoDescarga className="h-4 w-4" />
            Descargar PDF
          </a>
        </form>
      </section>

      {ocurrencias.length === 0 ? (
        <section className="card animar-aparecer p-6 text-center">
          <p className="text-4xl" aria-hidden>
            📓
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">Aún no hay ocurrencias</h2>
          <p className="mt-1 text-slate-600">
            Registra la primera con el formulario de arriba. Aparecerán aquí, de la más
            reciente a la más antigua.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {ocurrencias.map((o, i) => (
            <li
              key={o.id}
              className="card animar-aparecer p-4"
              style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip bg-slate-900 text-white">{etiquetaCategoria(o.categoria)}</span>
                <span className="num text-sm font-semibold text-slate-500">{fechaCorta(o.fecha)}</span>
              </div>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{o.titulo}</h3>
              {o.detalle && (
                <p className="mt-1 whitespace-pre-line text-slate-700">{o.detalle}</p>
              )}
              {o.fotos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.fotos.map((f) =>
                    f.url ? (
                      <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.url}
                          alt="Evidencia"
                          className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                        />
                      </a>
                    ) : null,
                  )}
                </div>
              )}
              {o.creadoPor && (
                <p className="mt-2 text-xs text-slate-400">Registrado por {o.creadoPor}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
