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
