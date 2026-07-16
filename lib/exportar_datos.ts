import { createClient } from "@/lib/supabase/server";
import { etiquetaPeriodo } from "@/lib/fechas";
import type { HojaExcel } from "@/lib/exportar";

// Arma las hojas de datos para el exportador (4.6) leyendo con el cliente de
// sesión, así que respeta RLS igual que el resto de la app. Todo en céntimos;
// el formato a soles lo hace lib/exportar.ts.

export type TipoDato = "cuotas" | "pagos" | "egresos" | "estado" | "caja";

export const TIPOS_DATO: { clave: TipoDato; etiqueta: string }[] = [
  { clave: "cuotas", etiqueta: "Cuotas por departamento" },
  { clave: "pagos", etiqueta: "Pagos registrados" },
  { clave: "egresos", etiqueta: "Egresos / gastos" },
  { clave: "estado", etiqueta: "Estado de cuenta por dpto" },
  { clave: "caja", etiqueta: "Caja por periodo" },
];

export type OpcionesExport = {
  datos: TipoDato[];
  periodoId?: number | null; // un solo periodo (botón "Descargar" de un mes)
  desdePeriodoId?: number | null; // rango de meses (exportación total)
  hastaPeriodoId?: number | null;
  dpto?: number | null;
  categoriaId?: number | null;
};

type PeriodoRef = {
  id: number;
  anio: number;
  mes: number;
  estado: string;
  saldo_inicial_cent: number | null;
  saldo_final_cent: number | null;
};

const MEDIO: Record<string, string> = {
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  otro: "Otro",
};

const orden = (p: { anio: number; mes: number }) => p.anio * 12 + p.mes;

// Periodos que entran en el export, según el filtro (uno, un rango, o todos).
async function resolverPeriodos(
  s: ReturnType<typeof createClient>,
  o: OpcionesExport,
): Promise<PeriodoRef[]> {
  const { data } = await s
    .from("periodos")
    .select("id, anio, mes, estado, saldo_inicial_cent, saldo_final_cent")
    .order("anio")
    .order("mes");
  let lista = (data ?? []) as PeriodoRef[];

  if (o.periodoId != null) return lista.filter((p) => p.id === o.periodoId);

  if (o.desdePeriodoId != null || o.hastaPeriodoId != null) {
    const desde = lista.find((p) => p.id === o.desdePeriodoId);
    const hasta = lista.find((p) => p.id === o.hastaPeriodoId);
    const min = desde ? orden(desde) : -Infinity;
    const max = hasta ? orden(hasta) : Infinity;
    lista = lista.filter((p) => orden(p) >= min && orden(p) <= max);
  }
  return lista;
}

async function hojaCuotas(
  s: ReturnType<typeof createClient>,
  periodos: PeriodoRef[],
  o: OpcionesExport,
): Promise<HojaExcel | null> {
  const ids = periodos.map((p) => p.id);
  if (ids.length === 0) return null;
  const etiqueta = new Map(periodos.map((p) => [p.id, etiquetaPeriodo(p.anio, p.mes)]));

  let q = s.from("cuotas").select("*").in("periodo_id", ids).order("periodo_id").order("dpto_id");
  if (o.dpto != null) q = q.eq("dpto_id", o.dpto);
  const { data } = await q;

  return {
    nombre: "Cuotas",
    columnas: [
      { encabezado: "Periodo", clave: "periodo", tipo: "texto" },
      { encabezado: "Dpto", clave: "dpto_id", tipo: "entero" },
      { encabezado: "Δ m³", clave: "m3_variacion", tipo: "entero" },
      { encabezado: "Agua consumo", clave: "agua_consumo_cent", tipo: "dinero" },
      { encabezado: "Agua común", clave: "agua_comun_cent", tipo: "dinero" },
      { encabezado: "Luz", clave: "luz_cent", tipo: "dinero" },
      { encabezado: "Vigilancia", clave: "vigilancia_cent", tipo: "dinero" },
      { encabezado: "Mantenimiento", clave: "manto_cent", tipo: "dinero" },
      { encabezado: "Materiales", clave: "materiales_cent", tipo: "dinero" },
      { encabezado: "Extra", clave: "extra_cent", tipo: "dinero" },
      { encabezado: "Ajuste", clave: "ajuste_cent", tipo: "dinero" },
      { encabezado: "Total", clave: "total_cent", tipo: "dinero" },
      { encabezado: "Estado", clave: "estado", tipo: "texto" },
    ],
    filas: (data ?? []).map((c) => ({ ...c, periodo: etiqueta.get(c.periodo_id) ?? "" })),
  };
}

async function hojaPagos(
  s: ReturnType<typeof createClient>,
  periodos: PeriodoRef[],
  o: OpcionesExport,
): Promise<HojaExcel | null> {
  const ids = periodos.map((p) => p.id);
  if (ids.length === 0) return null;
  const etiqueta = new Map(periodos.map((p) => [p.id, etiquetaPeriodo(p.anio, p.mes)]));

  // cuota_id → { dpto, periodo } para etiquetar cada pago.
  let qc = s.from("cuotas").select("id, dpto_id, periodo_id").in("periodo_id", ids);
  if (o.dpto != null) qc = qc.eq("dpto_id", o.dpto);
  const { data: cuotas } = await qc;
  const info = new Map((cuotas ?? []).map((c) => [c.id, c]));
  const cuotaIds = [...info.keys()];
  if (cuotaIds.length === 0)
    return { nombre: "Pagos", columnas: colsPagos(), filas: [] };

  const { data: pagos } = await s
    .from("pagos")
    .select("*")
    .in("cuota_id", cuotaIds)
    .order("fecha_pago")
    .order("id");

  return {
    nombre: "Pagos",
    columnas: colsPagos(),
    filas: (pagos ?? []).map((p) => {
      const c = info.get(p.cuota_id);
      return {
        periodo: c ? etiqueta.get(c.periodo_id) ?? "" : "",
        dpto_id: c?.dpto_id ?? "",
        fecha_pago: p.fecha_pago,
        medio: MEDIO[p.medio] ?? p.medio,
        monto_cent: p.monto_cent,
        nota: p.nota ?? "",
      };
    }),
  };
}

function colsPagos() {
  return [
    { encabezado: "Periodo", clave: "periodo", tipo: "texto" as const },
    { encabezado: "Dpto", clave: "dpto_id", tipo: "entero" as const },
    { encabezado: "Fecha", clave: "fecha_pago", tipo: "fecha" as const },
    { encabezado: "Medio", clave: "medio", tipo: "texto" as const },
    { encabezado: "Monto", clave: "monto_cent", tipo: "dinero" as const },
    { encabezado: "Nota", clave: "nota", tipo: "texto" as const },
  ];
}

async function hojaEgresos(
  s: ReturnType<typeof createClient>,
  periodos: PeriodoRef[],
  o: OpcionesExport,
): Promise<HojaExcel | null> {
  const ids = periodos.map((p) => p.id);
  if (ids.length === 0) return null;
  const etiqueta = new Map(periodos.map((p) => [p.id, etiquetaPeriodo(p.anio, p.mes)]));
  const { data: cats } = await s.from("categorias_egreso").select("id, nombre");
  const nombreCat = new Map((cats ?? []).map((c) => [c.id, c.nombre]));

  let q = s.from("egresos").select("*").in("periodo_id", ids).order("fecha");
  if (o.categoriaId != null) q = q.eq("categoria_id", o.categoriaId);
  const { data } = await q;

  return {
    nombre: "Egresos",
    columnas: [
      { encabezado: "Periodo", clave: "periodo", tipo: "texto" },
      { encabezado: "Fecha", clave: "fecha", tipo: "fecha" },
      { encabezado: "Categoría", clave: "categoria", tipo: "texto" },
      { encabezado: "Concepto", clave: "concepto", tipo: "texto" },
      { encabezado: "Monto", clave: "monto_cent", tipo: "dinero" },
      { encabezado: "Pagado", clave: "pagado", tipo: "texto" },
    ],
    filas: (data ?? []).map((e) => ({
      periodo: etiqueta.get(e.periodo_id) ?? "",
      fecha: e.fecha,
      categoria: e.categoria_id != null ? nombreCat.get(e.categoria_id) ?? "" : "",
      concepto: e.concepto,
      monto_cent: e.monto_cent,
      pagado: e.pagado ? "Sí" : "Por pagar",
    })),
  };
}

async function hojaEstadoCuenta(
  s: ReturnType<typeof createClient>,
  periodos: PeriodoRef[],
  o: OpcionesExport,
): Promise<HojaExcel | null> {
  // Solo periodos con cuotas ya congeladas.
  const ids = periodos.filter((p) => p.estado !== "borrador").map((p) => p.id);
  if (ids.length === 0) return null;

  const { data: cuotas } = await s
    .from("cuotas")
    .select("id, dpto_id, total_cent")
    .in("periodo_id", ids);
  const lista = (cuotas ?? []).filter((c) => o.dpto == null || c.dpto_id === o.dpto);

  const cargos = new Map<number, number>();
  const dptoDeCuota = new Map<number, number>();
  for (const c of lista) {
    cargos.set(c.dpto_id, (cargos.get(c.dpto_id) ?? 0) + c.total_cent);
    dptoDeCuota.set(c.id, c.dpto_id);
  }
  const abonos = new Map<number, number>();
  const cuotaIds = [...dptoDeCuota.keys()];
  if (cuotaIds.length > 0) {
    const { data: pagos } = await s
      .from("pagos")
      .select("cuota_id, monto_cent")
      .in("cuota_id", cuotaIds);
    for (const p of pagos ?? []) {
      const d = dptoDeCuota.get(p.cuota_id);
      if (d != null) abonos.set(d, (abonos.get(d) ?? 0) + p.monto_cent);
    }
  }

  const dptos = [...new Set([...cargos.keys(), ...abonos.keys()])].sort((a, b) => a - b);
  return {
    nombre: "Estado de cuenta",
    columnas: [
      { encabezado: "Dpto", clave: "dpto", tipo: "entero" },
      { encabezado: "Cargos", clave: "cargos", tipo: "dinero" },
      { encabezado: "Pagos", clave: "abonos", tipo: "dinero" },
      { encabezado: "Saldo", clave: "saldo", tipo: "dinero" },
    ],
    filas: dptos.map((d) => {
      const c = cargos.get(d) ?? 0;
      const a = abonos.get(d) ?? 0;
      return { dpto: d, cargos: c, abonos: a, saldo: c - a };
    }),
  };
}

function hojaCaja(periodos: PeriodoRef[]): HojaExcel | null {
  if (periodos.length === 0) return null;
  return {
    nombre: "Caja",
    columnas: [
      { encabezado: "Periodo", clave: "periodo", tipo: "texto" },
      { encabezado: "Estado", clave: "estado", tipo: "texto" },
      { encabezado: "Saldo inicial", clave: "saldo_inicial_cent", tipo: "dinero" },
      { encabezado: "Saldo final", clave: "saldo_final_cent", tipo: "dinero" },
    ],
    filas: periodos.map((p) => ({
      periodo: etiquetaPeriodo(p.anio, p.mes),
      estado: p.estado,
      saldo_inicial_cent: p.saldo_inicial_cent,
      saldo_final_cent: p.saldo_final_cent,
    })),
  };
}

// Arma todas las hojas pedidas, en orden estable.
export async function armarHojas(o: OpcionesExport): Promise<HojaExcel[]> {
  const s = createClient();
  const periodos = await resolverPeriodos(s, o);

  const hojas: HojaExcel[] = [];
  for (const tipo of o.datos) {
    let h: HojaExcel | null = null;
    if (tipo === "cuotas") h = await hojaCuotas(s, periodos, o);
    else if (tipo === "pagos") h = await hojaPagos(s, periodos, o);
    else if (tipo === "egresos") h = await hojaEgresos(s, periodos, o);
    else if (tipo === "estado") h = await hojaEstadoCuenta(s, periodos, o);
    else if (tipo === "caja") h = hojaCaja(periodos);
    if (h) hojas.push(h);
  }
  return hojas;
}
