import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/lib/database.types";
import type { Periodo } from "@/lib/periodos";
import { prorratear } from "@/lib/centimos";

// Las funciones de lectura aceptan un cliente opcional. Por defecto usan el
// cliente de sesión (`createClient`); la vista pública les pasa el cliente
// anónimo (`createPublicClient`) para leer bajo las políticas RLS `pub_*`.
export type ClienteDatos = SupabaseClient<Database>;

export type Egreso = Tables<"egresos">;
export type CategoriaEgreso = Tables<"categorias_egreso">;

export async function getCategorias(): Promise<CategoriaEgreso[]> {
  const s = createClient();
  const { data } = await s.from("categorias_egreso").select("*").order("id");
  return data ?? [];
}

// El periodo "abierto" donde se registran egresos y se cobra: el más antiguo
// no cerrado. (Puede convivir un emitido en cobranza con un borrador nuevo;
// la caja viva es la del más antiguo.)
export async function getPeriodoAbierto(
  client?: ClienteDatos,
): Promise<Periodo | null> {
  const s = client ?? createClient();
  const { data } = await s
    .from("periodos")
    .select("*")
    .neq("estado", "cerrado")
    .order("anio")
    .order("mes")
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export type FiltroEgresos = {
  periodoId?: number | null; // null/undefined = todos
  categoriaId?: number | null;
};

export async function getEgresos(
  filtro: FiltroEgresos = {},
  client?: ClienteDatos,
): Promise<Egreso[]> {
  const s = client ?? createClient();
  let q = s
    .from("egresos")
    .select("*")
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });
  if (filtro.periodoId != null) q = q.eq("periodo_id", filtro.periodoId);
  if (filtro.categoriaId != null) q = q.eq("categoria_id", filtro.categoriaId);
  const { data } = await q;
  return data ?? [];
}

// Libro de caja de un periodo.
//  - Abierto (borrador/emitido): ingresos = pagos aún no contabilizados (los
//    recogerá el cierre de este mes, incluidos atrasos de meses cerrados).
//  - Cerrado: ingresos = pagos contabilizados en su cierre.
export type LibroCaja = {
  periodo: Periodo;
  saldoInicialCent: number;
  saldoInicialPendiente: boolean; // true si aún no está fijado (1er mes, hasta la migración histórica)
  ingresosCent: number;
  egresosPagadosCent: number;
  porPagarCent: number; // egresos registrados no pagados (no entran a caja)
  saldoActualCent: number; // proyectado si abierto; el final real si cerrado
};

export async function getLibroCaja(
  periodo: Periodo,
  client?: ClienteDatos,
): Promise<LibroCaja> {
  const s = client ?? createClient();

  let ingresos = 0;
  if (periodo.estado === "cerrado") {
    const { data } = await s
      .from("pagos")
      .select("monto_cent")
      .eq("contabilizado_en_periodo", periodo.id);
    ingresos = (data ?? []).reduce((a, p) => a + p.monto_cent, 0);
  } else {
    const { data } = await s
      .from("pagos")
      .select("monto_cent")
      .is("contabilizado_en_periodo", null);
    ingresos = (data ?? []).reduce((a, p) => a + p.monto_cent, 0);
  }

  const { data: egresos } = await s
    .from("egresos")
    .select("monto_cent, pagado")
    .eq("periodo_id", periodo.id);
  const egresosPagados = (egresos ?? [])
    .filter((e) => e.pagado)
    .reduce((a, e) => a + e.monto_cent, 0);
  const porPagar = (egresos ?? [])
    .filter((e) => !e.pagado)
    .reduce((a, e) => a + e.monto_cent, 0);

  const saldoInicial = periodo.saldo_inicial_cent ?? 0;
  const saldoActual =
    periodo.estado === "cerrado" && periodo.saldo_final_cent !== null
      ? periodo.saldo_final_cent
      : saldoInicial + ingresos - egresosPagados;

  return {
    periodo,
    saldoInicialCent: saldoInicial,
    saldoInicialPendiente: periodo.saldo_inicial_cent === null,
    ingresosCent: ingresos,
    egresosPagadosCent: egresosPagados,
    porPagarCent: porPagar,
    saldoActualCent: saldoActual,
  };
}

// Historial de cierres (periodos cerrados, más reciente primero).
export async function getCierres(): Promise<Periodo[]> {
  const s = createClient();
  const { data } = await s
    .from("periodos")
    .select("*")
    .eq("estado", "cerrado")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });
  return data ?? [];
}

// ---------- Morosidad (2.5) ----------
export type DeudaCuota = {
  anio: number;
  mes: number;
  saldoCent: number;
};
export type DeudaDpto = {
  dpto: number;
  totalCent: number;
  cuotas: DeudaCuota[]; // más antigua primero
};

// Cuotas emitidas/cerradas con saldo pendiente, agrupadas por dpto.
export async function getDeudasPorDpto(
  client?: ClienteDatos,
): Promise<DeudaDpto[]> {
  const s = client ?? createClient();
  const { data: periodos } = await s
    .from("periodos")
    .select("id, anio, mes")
    .in("estado", ["emitido", "cerrado"]);
  const infoPeriodo = new Map((periodos ?? []).map((p) => [p.id, p]));
  const ids = [...infoPeriodo.keys()];
  if (ids.length === 0) return [];

  const { data: cuotas } = await s
    .from("cuotas")
    .select("id, periodo_id, dpto_id, total_cent")
    .in("periodo_id", ids);
  const listaCuotas = cuotas ?? [];
  if (listaCuotas.length === 0) return [];

  const { data: pagos } = await s
    .from("pagos")
    .select("cuota_id, monto_cent")
    .in("cuota_id", listaCuotas.map((c) => c.id));
  const pagado = new Map<number, number>();
  for (const p of pagos ?? []) {
    pagado.set(p.cuota_id, (pagado.get(p.cuota_id) ?? 0) + p.monto_cent);
  }

  const porDpto = new Map<number, DeudaCuota[]>();
  for (const c of listaCuotas) {
    const saldo = c.total_cent - (pagado.get(c.id) ?? 0);
    if (saldo <= 0) continue;
    const p = infoPeriodo.get(c.periodo_id)!;
    const lista = porDpto.get(c.dpto_id) ?? [];
    lista.push({ anio: p.anio, mes: p.mes, saldoCent: saldo });
    porDpto.set(c.dpto_id, lista);
  }

  return [...porDpto.entries()]
    .map(([dpto, cuotas]) => ({
      dpto,
      cuotas: cuotas.sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes)),
      totalCent: cuotas.reduce((a, c) => a + c.saldoCent, 0),
    }))
    .sort((a, b) => a.dpto - b.dpto);
}

// ---------- Consumo de agua, últimos 6 meses (para el dashboard 2.4) ----------
export type ConsumoDpto = {
  dpto: number;
  meses: Array<{ anio: number; mes: number; m3: number }>; // más antiguo primero
};

export async function getConsumo6Meses(
  client?: ClienteDatos,
): Promise<ConsumoDpto[]> {
  const s = client ?? createClient();
  const { data: periodos } = await s
    .from("periodos")
    .select("id, anio, mes")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .limit(6);
  const lista = (periodos ?? []).sort(
    (a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes),
  );
  if (lista.length === 0) return [];

  const { data: lecturas } = await s
    .from("lecturas_agua")
    .select("periodo_id, dpto_id, lectura_anterior, lectura_actual")
    .in("periodo_id", lista.map((p) => p.id));

  const porDpto = new Map<number, Map<number, number>>(); // dpto → periodo_id → m3
  for (const l of lecturas ?? []) {
    const m = porDpto.get(l.dpto_id) ?? new Map<number, number>();
    m.set(l.periodo_id, l.lectura_actual - l.lectura_anterior);
    porDpto.set(l.dpto_id, m);
  }

  return [...porDpto.entries()]
    .map(([dpto, porPeriodo]) => ({
      dpto,
      meses: lista
        .filter((p) => porPeriodo.has(p.id))
        .map((p) => ({ anio: p.anio, mes: p.mes, m3: porPeriodo.get(p.id)! })),
    }))
    .sort((a, b) => a.dpto - b.dpto);
}

// ---------- Conciliación de agua (3.3, el "Cuadre Agua") ----------
export type Conciliacion = Tables<"conciliaciones_agua">;

export type ConciliacionPreview = {
  periodos: { id: number; anio: number; mes: number }[];
  cobradoCent: number; // Σ recibos de agua del rango (lo distribuido)
  facturadoRealCent: number; // total real Sedapal del rango (input manual)
  diferenciaCent: number; // facturado − cobrado (+ = faltó cobrar)
  porDpto: { dpto: number; consumoM3: number; ajusteCent: number }[];
};

// Calcula el cuadre: compara lo cobrado por agua en un rango de periodos contra
// el total real de Sedapal, y prorratea la diferencia por consumo (Δm3).
export async function getConciliacionPreview(
  desdeId: number,
  hastaId: number,
  facturadoRealCent: number,
): Promise<ConciliacionPreview | null> {
  const s = createClient();
  const { data: extremos } = await s
    .from("periodos")
    .select("id, anio, mes")
    .in("id", [desdeId, hastaId]);
  if (!extremos || extremos.length === 0) return null;
  const ordenes = extremos.map((p) => p.anio * 12 + p.mes);
  const min = Math.min(...ordenes);
  const max = Math.max(...ordenes);

  const { data: todos } = await s
    .from("periodos")
    .select("id, anio, mes, estado");
  const enRango = (todos ?? []).filter((p) => {
    const o = p.anio * 12 + p.mes;
    return o >= min && o <= max && (p.estado === "emitido" || p.estado === "cerrado");
  });
  const ids = enRango.map((p) => p.id);
  if (ids.length === 0) return null;

  const { data: recibos } = await s
    .from("recibos_servicios")
    .select("monto_cent, tipo, periodo_id")
    .eq("tipo", "agua")
    .in("periodo_id", ids);
  const cobrado = (recibos ?? []).reduce((a, r) => a + r.monto_cent, 0);

  const { data: lecturas } = await s
    .from("lecturas_agua")
    .select("dpto_id, lectura_anterior, lectura_actual")
    .in("periodo_id", ids);
  const consumo = new Map<number, number>();
  for (const l of lecturas ?? [])
    consumo.set(
      l.dpto_id,
      (consumo.get(l.dpto_id) ?? 0) + (l.lectura_actual - l.lectura_anterior),
    );
  const dptos = [...consumo.keys()].sort((a, b) => a - b);
  const pesos = dptos.map((d) => consumo.get(d)!);

  const diferencia = facturadoRealCent - cobrado;
  const ajustes = prorratear(diferencia, pesos);

  return {
    periodos: enRango
      .sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes))
      .map((p) => ({ id: p.id, anio: p.anio, mes: p.mes })),
    cobradoCent: cobrado,
    facturadoRealCent,
    diferenciaCent: diferencia,
    porDpto: dptos.map((d, i) => ({
      dpto: d,
      consumoM3: consumo.get(d)!,
      ajusteCent: ajustes[i] ?? 0,
    })),
  };
}

export async function getConciliaciones(): Promise<Conciliacion[]> {
  const s = createClient();
  const { data } = await s
    .from("conciliaciones_agua")
    .select("*")
    .order("id", { ascending: false });
  return data ?? [];
}

// ---------- Provisiones (saldo acumulado, para el dashboard) ----------
export type SaldoProvision = { concepto: string; saldoCent: number };

export async function getSaldosProvisiones(
  client?: ClienteDatos,
): Promise<SaldoProvision[]> {
  const s = client ?? createClient();
  const [{ data: provisiones }, { data: movimientos }] = await Promise.all([
    s.from("provisiones").select("id, concepto").eq("activo", true).order("id"),
    s.from("movimientos_provision").select("provision_id, monto_cent"),
  ]);
  const saldo = new Map<number, number>();
  for (const m of movimientos ?? []) {
    saldo.set(m.provision_id, (saldo.get(m.provision_id) ?? 0) + m.monto_cent);
  }
  return (provisiones ?? []).map((p) => ({
    concepto: p.concepto,
    saldoCent: saldo.get(p.id) ?? 0,
  }));
}

export type Provision = Tables<"provisiones">;
export type MovimientoProvision = Tables<"movimientos_provision">;

export type ProvisionConSaldo = Provision & { saldoCent: number };

// Provisiones con su saldo acumulado (para el módulo de provisiones).
export async function getProvisionesConSaldo(): Promise<ProvisionConSaldo[]> {
  const s = createClient();
  const [{ data: provisiones }, { data: movimientos }] = await Promise.all([
    s.from("provisiones").select("*").order("id"),
    s.from("movimientos_provision").select("provision_id, monto_cent"),
  ]);
  const saldo = new Map<number, number>();
  for (const m of movimientos ?? []) {
    saldo.set(m.provision_id, (saldo.get(m.provision_id) ?? 0) + m.monto_cent);
  }
  return (provisiones ?? []).map((p) => ({ ...p, saldoCent: saldo.get(p.id) ?? 0 }));
}

// Últimos movimientos de provisión (aportes y usos), más reciente primero.
export async function getMovimientosProvision(
  limite = 20,
): Promise<MovimientoProvision[]> {
  const s = createClient();
  const { data } = await s
    .from("movimientos_provision")
    .select("*")
    .order("id", { ascending: false })
    .limit(limite);
  return data ?? [];
}
