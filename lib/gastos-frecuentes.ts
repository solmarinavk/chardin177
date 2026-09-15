// Gastos frecuentes de un toque + clasificación de los gastos que se repiten.
//
// La tesorera registra cada mes casi lo mismo: las dos quincenas del portero,
// el recibo de agua, el de luz, el ascensor. Escribirlo a mano cada vez es por
// donde se cuelan los errores (7500 en vez de 750, o dejar la categoría en la
// primera de la lista). Aquí se sacan, del propio historial, los gastos más
// repetidos para ofrecerlos como botones que llenan el formulario: la persona
// solo confirma. Lógica pura, sin base de datos, para poder probarla.

export type EgresoHistorico = {
  id: number;
  concepto: string;
  categoria_id: number | null;
  monto_cent: number;
  fecha: string; // YYYY-MM-DD
};

export type GastoFrecuente = {
  clave: string; // concepto normalizado (sirve de key)
  concepto: string; // tal como se escribió la última vez
  categoria_id: number | null;
  monto_cent: number; // el de la última vez
  veces: number;
  ultimaFecha: string;
};

export const MAX_FRECUENTES = 6;

// "Pago  quincena Vigilancia (Perci)" → "pago quincena vigilancia perci"
export function normalizarConcepto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

function esMasReciente(a: EgresoHistorico, b: EgresoHistorico): boolean {
  return a.fecha > b.fecha || (a.fecha === b.fecha && a.id > b.id);
}

// Los conceptos más repetidos, con la categoría y el monto de la última vez.
// Las correcciones (monto negativo) no son gastos y quedan fuera.
export function gastosFrecuentes(
  egresos: EgresoHistorico[],
  max = MAX_FRECUENTES,
): GastoFrecuente[] {
  const grupos = new Map<string, { ultimo: EgresoHistorico; veces: number }>();
  for (const e of egresos) {
    if (e.monto_cent <= 0) continue;
    const clave = normalizarConcepto(e.concepto);
    if (clave.length === 0) continue;
    const g = grupos.get(clave);
    if (!g) {
      grupos.set(clave, { ultimo: e, veces: 1 });
      continue;
    }
    g.veces += 1;
    if (esMasReciente(e, g.ultimo)) g.ultimo = e;
  }
  return [...grupos.entries()]
    .map(([clave, g]) => ({
      clave,
      concepto: g.ultimo.concepto.trim(),
      categoria_id: g.ultimo.categoria_id,
      monto_cent: g.ultimo.monto_cent,
      veces: g.veces,
      ultimaFecha: g.ultimo.fecha,
    }))
    .sort(
      (a, b) =>
        b.veces - a.veces ||
        (a.ultimaFecha < b.ultimaFecha ? 1 : a.ultimaFecha > b.ultimaFecha ? -1 : 0) ||
        a.concepto.localeCompare(b.concepto, "es"),
    )
    .slice(0, max);
}

// ---------------------------------------------------------------------------
// Los tres gastos que hay que hacer TODOS los meses. Se reconocen por la
// categoría o, si la tesorera dejó otra, por lo que escribió en el concepto
// ("Sedapal", "quincena", "Perci"…). Sirve para el checklist del mes y para
// elegir qué botón de gasto frecuente prellenar.
// ---------------------------------------------------------------------------

export type TipoGasto = "portero" | "agua" | "luz";

export function clasificarGasto(
  concepto: string,
  categoria: string | null,
): TipoGasto | null {
  const c = ` ${normalizarConcepto(concepto)} `;
  const cat = categoria ? normalizarConcepto(categoria) : "";
  if (cat === "vigilancia" || /\b(vigila\w*|quincena|porter\w*|perc[iy])\b/.test(c))
    return "portero";
  if (cat === "agua" || /\b(sedapal|agua)\b/.test(c)) return "agua";
  if (cat === "luz" || /\b(luz|electric\w*|enel)\b/.test(c)) return "luz";
  return null;
}

// El gasto frecuente que corresponde a un tipo (para abrir el formulario ya
// lleno desde el checklist). null si nunca se registró uno así.
export function presetPara(
  tipo: TipoGasto,
  frecuentes: GastoFrecuente[],
  nombreCategoria: Map<number, string>,
): GastoFrecuente | null {
  return (
    frecuentes.find(
      (g) =>
        clasificarGasto(
          g.concepto,
          g.categoria_id === null ? null : (nombreCategoria.get(g.categoria_id) ?? null),
        ) === tipo,
    ) ?? null
  );
}

export function esTipoGasto(v: unknown): v is TipoGasto {
  return v === "portero" || v === "agua" || v === "luz";
}
