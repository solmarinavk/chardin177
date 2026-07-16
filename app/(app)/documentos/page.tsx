import type { Metadata } from "next";
import { requireRol } from "@/lib/roles";
import { getDocumentos } from "@/lib/documentos";
import { BUCKET_DOCUMENTOS, urlFirmada } from "@/lib/storage";
import { formatoFecha } from "@/lib/fechas";
import { IconoDocumento, IconoDescarga, IconoFlecha } from "@/components/iconos";
import { FormDocumento } from "@/components/forms/documento";
import { subirDocumento } from "./acciones";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentosPage() {
  await requireRol(["tesoreria", "admin"]);

  const documentos = await getDocumentos();
  const urls = new Map<number, string>();
  for (const d of documentos) {
    const url = await urlFirmada(BUCKET_DOCUMENTOS, d.url, 3600);
    if (url) urls.set(d.id, url);
  }

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Documentos
        </h1>
        <p className="mt-1 text-slate-600">
          Reglamento, actas, presupuestos y el Excel histórico del edificio, en
          un solo lugar.
        </p>
      </div>

      <section className="card animar-aparecer p-5">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 font-bold text-slate-900">
            <IconoFlecha className="h-4 w-4 transition-transform group-open:rotate-90" />
            Subir un documento
          </summary>
          <div className="mt-3">
            <FormDocumento accion={subirDocumento} />
          </div>
        </details>
      </section>

      {documentos.length === 0 ? (
        <section className="card animar-aparecer p-6 text-center">
          <p className="text-4xl" aria-hidden>
            📄
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Todavía no hay documentos
          </h2>
          <p className="mt-1 text-slate-600">
            Sube el primero con el botón de arriba.
          </p>
        </section>
      ) : (
        <section className="animar-aparecer flex flex-col gap-2">
          {documentos.map((d) => (
            <article
              key={d.id}
              className="card flex items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <IconoDocumento className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{d.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {d.categoria && (
                      <span className="chip mr-1 bg-slate-100 text-slate-600">
                        {d.categoria}
                      </span>
                    )}
                    <span className="num">{formatoFecha(d.creado_en)}</span>
                  </p>
                </div>
              </div>
              {urls.has(d.id) && (
                <a
                  href={urls.get(d.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary min-h-[40px] shrink-0 px-3 py-2 text-sm"
                >
                  <IconoDescarga className="h-4 w-4" />
                  Abrir
                </a>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
