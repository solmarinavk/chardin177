// El "GPS del mes": dado el periodo y sus datos, dice qué pasos ya se hicieron
// y cuál toca ahora. Lógica pura (sin base de datos) para poder testearla y
// usarla en cualquier pantalla.

import type { EstadoPeriodo } from "@/lib/database.types";
import { clasificarGasto, type TipoGasto } from "@/lib/gastos-frecuentes";

export type PeriodoLite = {
  id: number;
  estado: EstadoPeriodo;
  anio: number;
  mes: number;
};

export type DatosFlujo = {
  lecturas: number; // cuántas de las 10 lecturas ya están
  reciboAgua: boolean;
  reciboLuz: boolean;
  cuotas: number; // cuántas cuotas calculadas (10 = listo)
  cuotasPagadas: number; // cuotas en estado 'pagado'
};

export type EstadoPaso = "hecho" | "actual" | "pendiente" | "bloqueado";

export type Paso = {
  clave: "lecturas" | "recibos" | "calcular" | "emitir" | "pagos" | "cerrar";
  titulo: string;
  descripcion: string;
  detalle: string | null; // avance corto, ej. "7/10"
  estado: EstadoPaso;
  href: string | null; // a dónde ir para hacerlo
  cta: string; // texto del botón de acción
};

export function pasosDelMes(p: PeriodoLite, d: DatosFlujo): Paso[] {
  const base = `/periodos/${p.id}`;
  const emitidoOCerrado = p.estado === "emitido" || p.estado === "cerrado";
  const recibosListos = d.reciboAgua && d.reciboLuz;
  const nRecibos = (d.reciboAgua ? 1 : 0) + (d.reciboLuz ? 1 : 0);

  const pasos: Paso[] = [
    {
      clave: "lecturas",
      titulo: "Lecturas de agua",
      descripcion: "El portero ingresa la lectura de los 10 medidores.",
      detalle: `${d.lecturas}/10`,
      estado: emitidoOCerrado || d.lecturas === 10 ? "hecho" : "pendiente",
      href: "/lecturas",
      cta: "Ingresar lecturas",
    },
    {
      clave: "recibos",
      titulo: "Recibos del mes",
      descripcion: "Tesorería registra el monto de agua (Sedapal) y luz común.",
      detalle: `${nRecibos}/2`,
      estado: emitidoOCerrado || recibosListos ? "hecho" : "pendiente",
      href: `${base}#recibos`,
      cta: "Subir recibos",
    },
    {
      clave: "calcular",
      titulo: "Calcular cuotas",
      descripcion:
        "El sistema reparte el agua por consumo y arma la cuota de cada departamento.",
      detalle: d.cuotas === 10 ? "10/10" : null,
      estado: emitidoOCerrado || d.cuotas === 10 ? "hecho" : "pendiente",
      href: `${base}#calcular`,
      cta: "Calcular cuotas",
    },
    {
      clave: "emitir",
      titulo: "Emitir el periodo",
      descripcion:
        "Congela las cuotas y las publica. Desde ahí ya no se editan (las correcciones van al mes siguiente).",
      detalle: null,
      estado: emitidoOCerrado ? "hecho" : "pendiente",
      href: `${base}#emitir`,
      cta: "Revisar y emitir",
    },
    {
      clave: "pagos",
      titulo: "Cobranza",
      descripcion:
        "Registra cada pago con su comprobante; el semáforo se actualiza solo.",
      detalle: emitidoOCerrado ? `${d.cuotasPagadas}/10` : null,
      estado:
        p.estado === "cerrado" || (p.estado === "emitido" && d.cuotasPagadas === 10)
          ? "hecho"
          : p.estado === "emitido"
            ? "pendiente"
            : "bloqueado",
      href: `${base}#pagos`,
      cta: "Registrar pagos",
    },
    {
      clave: "cerrar",
      titulo: "Cerrar el mes",
      descripcion:
        "Cuadra la caja, fija el saldo final y abre el mes siguiente con el saldo arrastrado. Las cuotas impagas pasan como deuda.",
      detalle: null,
      estado:
        p.estado === "cerrado"
          ? "hecho"
          : p.estado === "emitido"
            ? "pendiente"
            : "bloqueado",
      href: `${base}#cerrar`,
      cta: "Cerrar mes",
    },
  ];

  // El paso "actual" es el primero pendiente (en orden).
  const primero = pasos.find((x) => x.estado === "pendiente");
  if (primero) primero.estado = "actual";
  return pasos;
}

// El paso que toca ahora (o null si el mes está al día).
export function pasoActual(pasos: Paso[]): Paso | null {
  return pasos.find((p) => p.estado === "actual") ?? null;
}

// ---------------------------------------------------------------------------
// Checklist del mes (6.8): además de los pasos en orden, la tesorera necesita
// ver QUÉ falta con nombre y apellido — qué dptos no han pagado y qué gastos
// fijos del mes no se han registrado. Todo puro, sin base de datos.
// ---------------------------------------------------------------------------

export type DptoPendiente = {
  dpto: number;
  debeCent: number;
  parcial: boolean; // ya pagó algo, pero no todo
};

// Departamentos que aún deben algo del mes, de menor a mayor.
export function dptosPendientes(
  cuotas: { id: number; dpto_id: number; total_cent: number }[],
  pagadoPorCuota: Map<number, number>,
): DptoPendiente[] {
  return cuotas
    .map((c) => {
      const pagado = pagadoPorCuota.get(c.id) ?? 0;
      return { dpto: c.dpto_id, debeCent: c.total_cent - pagado, parcial: pagado > 0 };
    })
    .filter((d) => d.debeCent > 0)
    .sort((a, b) => a.dpto - b.dpto);
}

export type EgresoDelMes = {
  concepto: string;
  categoria: string | null; // nombre de la categoría
  monto_cent: number;
};

export type TareaRecurrente = {
  clave: TipoGasto;
  titulo: string;
  descripcion: string;
  detalle: string;
  // "despues" = todavía no toca (p. ej. la segunda quincena antes del 28).
  estado: "hecho" | "pendiente" | "despues";
  href: string;
};

// Cuántas quincenas del portero "ya deberían" estar pagadas hoy: la primera
// desde el 15, la segunda desde el 28. Si el mes ya pasó, las dos.
export function quincenasEsperadas(
  p: { anio: number; mes: number },
  hoy: string,
): 0 | 1 | 2 {
  const [a, m, d] = hoy.split("-").map(Number) as [number, number, number];
  const ordenHoy = a * 12 + m;
  const ordenPeriodo = p.anio * 12 + p.mes;
  if (ordenPeriodo < ordenHoy) return 2;
  if (ordenPeriodo > ordenHoy) return 0;
  return d >= 28 ? 2 : d >= 15 ? 1 : 0;
}

// Los gastos fijos del mes y si ya están registrados. Las correcciones
// (monto negativo) no cuentan como pago.
export function tareasRecurrentes(
  p: { anio: number; mes: number },
  egresos: EgresoDelMes[],
  hoy: string,
): TareaRecurrente[] {
  const tipos = egresos
    .filter((e) => e.monto_cent > 0)
    .map((e) => clasificarGasto(e.concepto, e.categoria));
  const cuantos = (t: TipoGasto) => tipos.filter((x) => x === t).length;

  const esperadas = quincenasEsperadas(p, hoy);
  const yaToca = esperadas >= 1; // a partir del 15 los recibos ya suelen haber llegado
  const portero = Math.min(cuantos("portero"), 2);
  const agua = cuantos("agua") > 0;
  const luz = cuantos("luz") > 0;

  return [
    {
      clave: "portero",
      titulo: "Quincena del portero",
      descripcion: "Se le paga el 15 y a fin de mes. Registra cada pago con su voucher.",
      detalle: `${portero}/2`,
      estado: portero >= 2 ? "hecho" : portero < esperadas ? "pendiente" : "despues",
      href: "/caja?registrar=gasto&tipo=portero",
    },
    {
      clave: "agua",
      titulo: "Pagar el recibo de agua (Sedapal)",
      descripcion: "Pagarlo y registrarlo como gasto. Si no se registra, la caja sale mal.",
      detalle: agua ? "registrado" : "sin registrar",
      estado: agua ? "hecho" : yaToca ? "pendiente" : "despues",
      href: "/caja?registrar=gasto&tipo=agua",
    },
    {
      clave: "luz",
      titulo: "Pagar el recibo de luz (Luz del Sur)",
      descripcion: "Pagarlo y registrarlo como gasto. Si no se registra, la caja sale mal.",
      detalle: luz ? "registrado" : "sin registrar",
      estado: luz ? "hecho" : yaToca ? "pendiente" : "despues",
      href: "/caja?registrar=gasto&tipo=luz",
    },
  ];
}
