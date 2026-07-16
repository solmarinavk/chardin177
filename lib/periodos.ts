import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import type { ClienteDatos } from "@/lib/caja";

export type Periodo = Tables<"periodos">;
export type Cuota = Tables<"cuotas">;
export type LecturaAgua = Tables<"lecturas_agua">;
export type ReciboServicio = Tables<"recibos_servicios">;
export type Departamento = Tables<"departamentos">;
export type Pago = Tables<"pagos">;

export async function listPeriodos(): Promise<Periodo[]> {
  const s = createClient();
  const { data } = await s
    .from("periodos")
    .select("*")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });
  return data ?? [];
}

// El periodo más reciente por año/mes (en cualquier estado), o null.
export async function getPeriodoActual(): Promise<Periodo | null> {
  const s = createClient();
  const { data } = await s
    .from("periodos")
    .select("*")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function getPeriodo(id: number): Promise<Periodo | null> {
  const s = createClient();
  const { data } = await s.from("periodos").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

// El único periodo en borrador (o null). La DB garantiza que hay como máximo uno.
export async function getBorrador(): Promise<Periodo | null> {
  const s = createClient();
  const { data } = await s
    .from("periodos")
    .select("*")
    .eq("estado", "borrador")
    .maybeSingle();
  return data ?? null;
}

export async function getDepartamentos(): Promise<Departamento[]> {
  const s = createClient();
  const { data } = await s.from("departamentos").select("*").order("id");
  return data ?? [];
}

export async function getCuotas(
  periodoId: number,
  client?: ClienteDatos,
): Promise<Cuota[]> {
  const s = client ?? createClient();
  const { data } = await s
    .from("cuotas")
    .select("*")
    .eq("periodo_id", periodoId)
    .order("dpto_id");
  return data ?? [];
}

// El periodo más reciente con cuotas ya calculadas (emitido o cerrado): el mes
// que hoy se está cobrando. Base del semáforo público de pagos.
export async function getPeriodoConCuotas(
  client?: ClienteDatos,
): Promise<Periodo | null> {
  const s = client ?? createClient();
  const { data } = await s
    .from("periodos")
    .select("*")
    .in("estado", ["emitido", "cerrado"])
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export type Derrama = {
  concepto: string;
  totalCent: number;
  porDpto: Map<number, number>;
};

// Derramas (cuotas extraordinarias) de un periodo, agrupadas por concepto.
// Se guardan como `ajustes` con origen='cuota_extra' y el motor las suma como EXTRA.
export async function getDerramas(periodoId: number): Promise<Derrama[]> {
  const s = createClient();
  const { data } = await s
    .from("ajustes")
    .select("dpto_id, concepto, monto_cent")
    .eq("periodo_id", periodoId)
    .eq("origen", "cuota_extra")
    .order("concepto");
  const porConcepto = new Map<string, Derrama>();
  for (const a of data ?? []) {
    const d =
      porConcepto.get(a.concepto) ??
      { concepto: a.concepto, totalCent: 0, porDpto: new Map<number, number>() };
    d.totalCent += a.monto_cent;
    d.porDpto.set(a.dpto_id, (d.porDpto.get(a.dpto_id) ?? 0) + a.monto_cent);
    porConcepto.set(a.concepto, d);
  }
  return [...porConcepto.values()];
}

export async function getLecturas(periodoId: number): Promise<LecturaAgua[]> {
  const s = createClient();
  const { data } = await s
    .from("lecturas_agua")
    .select("*")
    .eq("periodo_id", periodoId)
    .order("dpto_id");
  return data ?? [];
}

export async function getRecibos(periodoId: number): Promise<{
  agua: ReciboServicio | null;
  luz: ReciboServicio | null;
}> {
  const s = createClient();
  const { data } = await s
    .from("recibos_servicios")
    .select("*")
    .eq("periodo_id", periodoId);
  const filas = data ?? [];
  return {
    agua: filas.find((r) => r.tipo === "agua") ?? null,
    luz: filas.find((r) => r.tipo === "luz") ?? null,
  };
}

// Lectura anterior por dpto = lectura_actual más reciente de un periodo previo
// (por anio/mes). Si no hay historial, queda en 0 (primer mes).
export async function getLecturasAnteriores(
  anio: number,
  mes: number,
): Promise<Map<number, number>> {
  const s = createClient();
  const orden = anio * 12 + (mes - 1);
  const { data: periodos } = await s.from("periodos").select("id, anio, mes");
  const previos = (periodos ?? []).filter((p) => p.anio * 12 + (p.mes - 1) < orden);
  const mapa = new Map<number, number>();
  if (previos.length === 0) return mapa;

  const idsOrdenados = previos
    .sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes))
    .map((p) => p.id);

  const { data: lecturas } = await s
    .from("lecturas_agua")
    .select("periodo_id, dpto_id, lectura_actual")
    .in("periodo_id", idsOrdenados);

  const rank = new Map(idsOrdenados.map((id, i) => [id, i]));
  const mejorRank = new Map<number, number>();
  for (const l of lecturas ?? []) {
    const r = rank.get(l.periodo_id) ?? -1;
    if (r > (mejorRank.get(l.dpto_id) ?? -1)) {
      mejorRank.set(l.dpto_id, r);
      mapa.set(l.dpto_id, l.lectura_actual);
    }
  }
  return mapa;
}

// Consumo promedio (Δm3) por dpto en los últimos 6 periodos (para alerta de variación).
export async function getPromediosConsumo(
  excluirPeriodoId: number,
): Promise<Map<number, number>> {
  const s = createClient();
  const { data: periodos } = await s
    .from("periodos")
    .select("id, anio, mes")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });
  const ids = (periodos ?? [])
    .filter((p) => p.id !== excluirPeriodoId)
    .slice(0, 6)
    .map((p) => p.id);

  const mapa = new Map<number, number>();
  if (ids.length === 0) return mapa;

  const { data: lecturas } = await s
    .from("lecturas_agua")
    .select("dpto_id, lectura_anterior, lectura_actual")
    .in("periodo_id", ids);

  const acc = new Map<number, { sum: number; n: number }>();
  for (const l of lecturas ?? []) {
    const delta = l.lectura_actual - l.lectura_anterior;
    const a = acc.get(l.dpto_id) ?? { sum: 0, n: 0 };
    a.sum += delta;
    a.n += 1;
    acc.set(l.dpto_id, a);
  }
  for (const [dpto, a] of acc) mapa.set(dpto, a.n ? a.sum / a.n : 0);
  return mapa;
}

// Resumen completo de un periodo para el flujo del mes y los dashboards:
// avance de lecturas/recibos/cuotas y recaudación.
export type ResumenPeriodo = {
  periodo: Periodo;
  lecturas: number;
  reciboAgua: boolean;
  reciboLuz: boolean;
  recibos: { agua: ReciboServicio | null; luz: ReciboServicio | null };
  cuotas: Cuota[];
  pagadoPorCuota: Map<number, number>;
  cuotasPagadas: number;
  esperadoCent: number;
  recaudadoCent: number;
};

export async function getResumenPeriodo(periodo: Periodo): Promise<ResumenPeriodo> {
  const [lecturas, recibos, cuotas, pagadoPorCuota] = await Promise.all([
    getLecturas(periodo.id),
    getRecibos(periodo.id),
    getCuotas(periodo.id),
    getPagadoPorCuota(periodo.id),
  ]);

  let recaudadoCent = 0;
  for (const monto of pagadoPorCuota.values()) recaudadoCent += monto;

  return {
    periodo,
    lecturas: lecturas.length,
    reciboAgua: recibos.agua !== null,
    reciboLuz: recibos.luz !== null,
    recibos,
    cuotas,
    pagadoPorCuota,
    cuotasPagadas: cuotas.filter((c) => c.estado === "pagado").length,
    esperadoCent: cuotas.reduce((acc, c) => acc + c.total_cent, 0),
    recaudadoCent,
  };
}

export type EstadoCuentaDpto = {
  dpto: number;
  cargos: number;
  abonos: number;
  saldo: number;
};

// Estado de cuenta por dpto: Σ cuotas (cargos) vs Σ pagos (abonos), en periodos
// emitidos o cerrados. saldo = cargos − abonos (positivo = debe).
export async function getEstadosDeCuenta(
  client?: ClienteDatos,
): Promise<EstadoCuentaDpto[]> {
  const s = client ?? createClient();
  const { data: periodos } = await s
    .from("periodos")
    .select("id")
    .in("estado", ["emitido", "cerrado"]);
  const ids = (periodos ?? []).map((p) => p.id);

  const cargos = new Map<number, number>();
  const abonos = new Map<number, number>();

  if (ids.length > 0) {
    const { data: cuotas } = await s
      .from("cuotas")
      .select("id, dpto_id, total_cent")
      .in("periodo_id", ids);
    const cuotaDpto = new Map<number, number>();
    for (const c of cuotas ?? []) {
      cargos.set(c.dpto_id, (cargos.get(c.dpto_id) ?? 0) + c.total_cent);
      cuotaDpto.set(c.id, c.dpto_id);
    }
    const cuotaIds = [...cuotaDpto.keys()];
    if (cuotaIds.length > 0) {
      const { data: pagos } = await s
        .from("pagos")
        .select("cuota_id, monto_cent")
        .in("cuota_id", cuotaIds);
      for (const p of pagos ?? []) {
        const d = cuotaDpto.get(p.cuota_id);
        if (d != null) abonos.set(d, (abonos.get(d) ?? 0) + p.monto_cent);
      }
    }
  }

  const dptos = new Set<number>([...cargos.keys(), ...abonos.keys()]);
  return [...dptos]
    .sort((a, b) => a - b)
    .map((dpto) => {
      const c = cargos.get(dpto) ?? 0;
      const a = abonos.get(dpto) ?? 0;
      return { dpto, cargos: c, abonos: a, saldo: c - a };
    });
}

// Pagos completos de un periodo, agrupados por cuota (para la lista de
// cobranza: ver el detalle de cada pago y poder anularlo).
export async function getPagosPorCuota(
  periodoId: number,
): Promise<Map<number, Pago[]>> {
  const s = createClient();
  const { data: cuotas } = await s
    .from("cuotas")
    .select("id")
    .eq("periodo_id", periodoId);
  const ids = (cuotas ?? []).map((c) => c.id);
  const mapa = new Map<number, Pago[]>();
  if (ids.length === 0) return mapa;

  const { data: pagos } = await s
    .from("pagos")
    .select("*")
    .in("cuota_id", ids)
    .order("fecha_pago")
    .order("id");
  for (const p of pagos ?? []) {
    const lista = mapa.get(p.cuota_id) ?? [];
    lista.push(p);
    mapa.set(p.cuota_id, lista);
  }
  return mapa;
}

// Céntimos pagados por cuota (para semáforo y estado de cuenta).
export async function getPagadoPorCuota(
  periodoId: number,
  client?: ClienteDatos,
): Promise<Map<number, number>> {
  const s = client ?? createClient();
  const { data: cuotas } = await s
    .from("cuotas")
    .select("id")
    .eq("periodo_id", periodoId);
  const ids = (cuotas ?? []).map((c) => c.id);
  const mapa = new Map<number, number>();
  if (ids.length === 0) return mapa;

  const { data: pagos } = await s
    .from("pagos")
    .select("cuota_id, monto_cent")
    .in("cuota_id", ids);
  for (const p of pagos ?? []) {
    mapa.set(p.cuota_id, (mapa.get(p.cuota_id) ?? 0) + p.monto_cent);
  }
  return mapa;
}
