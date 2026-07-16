import { createPublicClient } from "@/lib/supabase/public";
import { BUCKET_COMPROBANTES } from "@/lib/storage";
import {
  getCuotas,
  getPagadoPorCuota,
  getPeriodoConCuotas,
  getEstadosDeCuenta,
  type Cuota,
  type Periodo,
  type EstadoCuentaDpto,
} from "@/lib/periodos";
import {
  getPeriodoAbierto,
  getLibroCaja,
  getEgresos,
  getConsumo6Meses,
  getSaldosProvisiones,
  getDeudasPorDpto,
  type LibroCaja,
  type Egreso,
  type ConsumoDpto,
  type SaldoProvision,
  type DeudaDpto,
} from "@/lib/caja";

// Datos de la vista PÚBLICA de transparencia. Todo se lee con el cliente
// anónimo (rol `anon`), así que las políticas RLS `pub_*` de la migración 0008
// son la única puerta: aquí no puede aparecer nada que el público no pueda ver.

export type EgresoPublico = Egreso & { comprobanteUrl: string | null };

export type SemaforoPublico = {
  periodo: Periodo;
  cuotas: Cuota[];
  pagadoPorCuota: Map<number, number>;
  esperadoCent: number;
  recaudadoCent: number;
};

export type PeriodoPublico = { id: number; anio: number; mes: number };

export type DatosTransparencia = {
  libro: LibroCaja | null;
  totalProvisionesCent: number;
  disponibleCent: number | null; // saldo de caja − provisiones apartadas
  provisiones: SaldoProvision[];
  egresos: EgresoPublico[];
  consumos: ConsumoDpto[];
  semaforo: SemaforoPublico | null;
  estados: EstadoCuentaDpto[];
  deudas: DeudaDpto[];
  periodos: PeriodoPublico[]; // meses ya emitidos/cerrados, del más nuevo al más viejo
};

// `periodoId` (5.4e): mes elegido en el selector público; si no viene o no es
// un mes ya emitido/cerrado, se usa el más reciente.
export async function getDatosTransparencia(
  periodoId?: number,
): Promise<DatosTransparencia> {
  const s = createPublicClient();

  const [abierto, ultimoConCuotas, { data: periodosLista }] = await Promise.all([
    getPeriodoAbierto(s),
    getPeriodoConCuotas(s),
    s
      .from("periodos")
      .select("id, anio, mes")
      .in("estado", ["emitido", "cerrado"])
      .order("anio", { ascending: false })
      .order("mes", { ascending: false }),
  ]);

  let periodoSemaforo = ultimoConCuotas;
  if (periodoId != null && (periodosLista ?? []).some((p) => p.id === periodoId)) {
    const { data: elegido } = await s
      .from("periodos")
      .select("*")
      .eq("id", periodoId)
      .maybeSingle();
    if (elegido) periodoSemaforo = elegido;
  }

  const [libro, provisiones, consumos, egresosRaw, estados, deudas] =
    await Promise.all([
      abierto ? getLibroCaja(abierto, s) : Promise.resolve(null),
      getSaldosProvisiones(s),
      getConsumo6Meses(s),
      getEgresos({}, s),
      getEstadosDeCuenta(s),
      getDeudasPorDpto(s),
    ]);

  // Semáforo del mes en cobranza (el periodo emitido/cerrado más reciente).
  let semaforo: SemaforoPublico | null = null;
  if (periodoSemaforo) {
    const [cuotas, pagadoPorCuota] = await Promise.all([
      getCuotas(periodoSemaforo.id, s),
      getPagadoPorCuota(periodoSemaforo.id, s),
    ]);
    let recaudadoCent = 0;
    for (const v of pagadoPorCuota.values()) recaudadoCent += v;
    semaforo = {
      periodo: periodoSemaforo,
      cuotas,
      pagadoPorCuota,
      esperadoCent: cuotas.reduce((a, c) => a + c.total_cent, 0),
      recaudadoCent,
    };
  }

  // Egresos con su comprobante: URL firmada bajo el rol anon. La política de
  // storage (0008) solo deja ver objetos 'egreso-%'; los comprobantes de pagos
  // y las fotos de medidores siguen privados.
  const egresos: EgresoPublico[] = await Promise.all(
    egresosRaw.map(async (e) => {
      let comprobanteUrl: string | null = null;
      if (e.comprobante_url) {
        const { data } = await s.storage
          .from(BUCKET_COMPROBANTES)
          .createSignedUrl(e.comprobante_url, 3600);
        comprobanteUrl = data?.signedUrl ?? null;
      }
      return { ...e, comprobanteUrl };
    }),
  );

  const totalProvisionesCent = provisiones.reduce((a, p) => a + p.saldoCent, 0);
  const disponibleCent = libro
    ? libro.saldoActualCent - totalProvisionesCent
    : null;

  return {
    libro,
    totalProvisionesCent,
    disponibleCent,
    provisiones,
    egresos,
    consumos,
    semaforo,
    estados,
    deudas,
    periodos: periodosLista ?? [],
  };
}
