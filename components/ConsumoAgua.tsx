import type { ConsumoDpto } from "@/lib/caja";
import { nombreMes } from "@/lib/fechas";

// Consumo de agua por dpto, últimos 6 meses (dashboard 2.4).
// Forma: small multiples (una mini-columna por dpto) — 10 series en un solo
// gráfico serían ilegibles a 380px. Color: UN solo tono (es magnitud, no
// identidad); el mes actual va más oscuro. Paleta validada con el validador
// de accesibilidad (#0ea5e9 / #075985 sobre blanco); el contraste del paso
// claro se compensa con la etiqueta visible del último valor y tooltips.
const AZUL_PREVIO = "#0ea5e9";
const AZUL_ACTUAL = "#075985";
const ALTO_BARRA = 44; // px de la barra más alta

export function ConsumoAgua({ consumos }: { consumos: ConsumoDpto[] }) {
  if (consumos.length === 0) return null;

  const maxM3 = Math.max(
    1,
    ...consumos.flatMap((c) => c.meses.map((m) => m.m3)),
  );

  return (
    <div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {consumos.map((c) => {
          const ultimo = c.meses[c.meses.length - 1];
          return (
            <li key={c.dpto} className="rounded-xl border border-slate-200 p-2.5">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-sm font-bold text-slate-900">{c.dpto}</span>
                <span className="num text-xs font-semibold text-sky-900">
                  {ultimo ? `${ultimo.m3} m³` : "—"}
                </span>
              </div>
              <div
                className="mt-1.5 flex items-end gap-0.5"
                style={{ height: ALTO_BARRA }}
                role="img"
                aria-label={`Consumo del dpto ${c.dpto}: ${c.meses
                  .map((m) => `${nombreMes(m.mes)} ${m.m3} m³`)
                  .join(", ")}`}
              >
                {c.meses.map((m, i) => {
                  const esUltimo = i === c.meses.length - 1;
                  const alto = Math.max(3, Math.round((m.m3 / maxM3) * ALTO_BARRA));
                  return (
                    <span
                      key={`${m.anio}-${m.mes}`}
                      className="flex-1 rounded-t"
                      style={{
                        height: alto,
                        backgroundColor: esUltimo ? AZUL_ACTUAL : AZUL_PREVIO,
                      }}
                      title={`${nombreMes(m.mes)} ${m.anio}: ${m.m3} m³`}
                    />
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Últimos 6 meses por departamento; el mes más reciente va en azul oscuro
        con su valor al lado. Toca una barra para ver el mes exacto.
      </p>
    </div>
  );
}
