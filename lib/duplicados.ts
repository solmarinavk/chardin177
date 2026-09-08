// Detección de gastos registrados dos veces.
//
// Pasó de verdad (setiembre 2026): el recibo de Sedapal de S/ 434.40 quedó
// ingresado dos veces el mismo día y la caja quedó S/ 434.40 por debajo de la
// realidad. La tesorera no tenía forma de darse cuenta mirando la pantalla.
//
// Criterio: dos gastos del MISMO mes, con el MISMO monto y la MISMA fecha son
// casi siempre un doble registro. La fecha entra en la clave a propósito: las
// dos quincenas del portero son de S/ 750 las dos, pero caen en días distintos
// (16 y 31), así que NO se marcan. El concepto no entra porque se escribe a
// mano y casi nunca coincide letra por letra ("Sedapal" vs "Recibo Sedapal").

import { formatoPEN } from "@/lib/centimos";
import { formatoFecha } from "@/lib/fechas";

export type EgresoComparable = {
  id: number;
  periodo_id: number;
  monto_cent: number;
  fecha: string;
};

export function claveDuplicado(e: EgresoComparable): string {
  return `${e.periodo_id}|${e.fecha}|${e.monto_cent}`;
}

// Grupos de 2 o más gastos idénticos, conservando el orden de entrada.
export function gruposDuplicados<T extends EgresoComparable>(egresos: T[]): T[][] {
  const porClave = new Map<string, T[]>();
  for (const e of egresos) {
    const clave = claveDuplicado(e);
    const grupo = porClave.get(clave);
    if (grupo) grupo.push(e);
    else porClave.set(clave, [e]);
  }
  return [...porClave.values()].filter((g) => g.length > 1);
}

// Ids de todos los gastos que caen en algún grupo repetido, para poder
// resaltarlos en la lista.
export function idsDuplicados(egresos: EgresoComparable[]): Set<number> {
  const ids = new Set<number>();
  for (const grupo of gruposDuplicados(egresos)) {
    for (const e of grupo) ids.add(e.id);
  }
  return ids;
}

// Cuánto dinero está contado de más: en cada grupo, todas las copias salvo una.
export function montoRepetidoCent(egresos: EgresoComparable[]): number {
  return gruposDuplicados(egresos).reduce(
    (suma, grupo) => suma + grupo[0]!.monto_cent * (grupo.length - 1),
    0,
  );
}

// ---------------------------------------------------------------------------
// Pagos de vecinos: aviso antes de registrar (6.8)
//
// La tesorera registra 10 pagos al mes, muchos más que gastos. Aquí se decide
// si conviene frenar y preguntar antes de guardar: el mismo pago dos veces, un
// dpto que ya pagó completo, o un monto que se pasa de la cuota (el 202 pagó
// S/ 459.00 sobre una cuota de S/ 458.13 y nadie lo notó). null = todo normal.
// ---------------------------------------------------------------------------

export type PagoPrevio = { monto_cent: number; fecha_pago: string };

export function avisoPago(a: {
  dpto: number;
  totalCent: number;
  pagadoCent: number;
  montoCent: number;
  fecha: string;
  previos: PagoPrevio[];
}): string | null {
  const igual = a.previos.find(
    (p) => p.monto_cent === a.montoCent && p.fecha_pago === a.fecha,
  );
  if (igual) {
    return (
      `Ya registraste un pago igual del dpto ${a.dpto}: ${formatoPEN(a.montoCent)} con fecha ${formatoFecha(a.fecha)}. ` +
      `Parece el mismo pago dos veces. Si de verdad son dos pagos distintos, marca la casilla y vuelve a darle a Registrar.`
    );
  }
  if (a.pagadoCent >= a.totalCent) {
    return (
      `El dpto ${a.dpto} ya pagó completo este mes (${formatoPEN(a.pagadoCent)} de ${formatoPEN(a.totalCent)}). ` +
      `Si aun así hay que registrar este pago, marca la casilla y vuelve a darle a Registrar.`
    );
  }
  const exceso = a.pagadoCent + a.montoCent - a.totalCent;
  if (exceso > 0) {
    const yaPago = a.pagadoCent > 0 ? ` y ya pagó ${formatoPEN(a.pagadoCent)}` : "";
    return (
      `Con este pago el dpto ${a.dpto} quedaría pagando ${formatoPEN(exceso)} de más (la cuota es ${formatoPEN(a.totalCent)}${yaPago}). ` +
      `Si el vecino transfirió de más, regístralo igual marcando la casilla: el exceso queda a su favor.`
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Correcciones de caja
//
// Cuando el error se descubre con el mes YA cerrado, el duplicado no se puede
// borrar (y está bien: la historia no se reescribe). La corrección va como una
// línea nueva en el mes abierto. Como la caja es `inicial + ingresos − egresos`,
// devolver plata es un egreso NEGATIVO.
// ---------------------------------------------------------------------------

export type DireccionCorreccion = "devolver" | "sacar";

export function esDireccionCorreccion(v: unknown): v is DireccionCorreccion {
  return v === "devolver" || v === "sacar";
}

// Recibe el monto SIEMPRE en positivo (lo que la persona escribe) y le pone el
// signo según hacia dónde va la plata.
export function montoCorreccionCent(
  direccion: DireccionCorreccion,
  montoCent: number,
): number {
  const abs = Math.abs(montoCent);
  return direccion === "devolver" ? -abs : abs;
}

// El concepto lleva prefijo para que se distinga de un gasto normal en el
// libro de caja y en la vista pública.
export const PREFIJO_CORRECCION = "Corrección: ";

export function conceptoCorreccion(texto: string): string {
  const limpio = texto.trim();
  return limpio.startsWith(PREFIJO_CORRECCION)
    ? limpio
    : `${PREFIJO_CORRECCION}${limpio}`;
}
