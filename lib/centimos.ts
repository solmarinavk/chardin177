// Helpers de dinero. REGLA DE ORO: todo se maneja en céntimos enteros
// (nunca floats). Se convierte a soles solo para mostrar en la UI.

// Redondeo "hacia afuera del cero" (half away from zero) para igualar EXACTO
// a round() de Postgres sobre numeric, que es donde vive el motor de cálculo.
//   redondearCentimo(2.5) === 3 ; redondearCentimo(-2.5) === -3
export function redondearCentimo(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x));
}

// Soles (p. ej. 1234.56) → céntimos (123456). Redondea para matar la cola
// de decimales del float: 19.99 * 100 = 1998.9999… → 1999.
export function aCentimos(soles: number): number {
  return redondearCentimo(soles * 100);
}

// Céntimos (123456) → soles (1234.56) como número. Úsalo solo para mostrar.
export function aSoles(centimos: number): number {
  return centimos / 100;
}

function conSeparadorDeMiles(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Céntimos → texto peruano "S/ 1,234.56". Negativos: "-S/ 1,234.56".
export function formatoPEN(centimos: number): string {
  const negativo = centimos < 0;
  const abs = Math.abs(Math.trunc(centimos));
  const soles = Math.trunc(abs / 100);
  const cent = abs % 100;
  return `${negativo ? "-" : ""}S/ ${conSeparadorDeMiles(soles)}.${cent
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Reparte `total` (céntimos) entre varios ítems en proporción a `pesos`
 * (p. ej. el consumo Δm3 de cada departamento), con la REGLA DEL RESIDUO:
 * se redondea cada ítem a céntimo y el residuo (positivo o negativo) se asigna
 * al ítem de mayor peso (mayor consumo). Así la suma cuadra EXACTA con `total`.
 *
 * Caso borde: si todos los pesos suman 0, reparte en partes iguales
 * (invariante #4 de la propuesta: Σ Δm3 = 0 → repartir igual).
 *
 * Devuelve un arreglo de céntimos de la misma longitud que `pesos`,
 * cuya suma es exactamente `total`.
 */
export function prorratear(total: number, pesos: number[]): number[] {
  const n = pesos.length;
  if (n === 0) return [];

  const suma = pesos.reduce((acc, p) => acc + p, 0);

  // Índice del mayor peso (primer máximo si hay empate).
  let idxMax = 0;
  for (let i = 1; i < n; i++) {
    if ((pesos[i] as number) > (pesos[idxMax] as number)) idxMax = i;
  }

  let asignado: number[];
  if (suma === 0) {
    const base = redondearCentimo(total / n);
    asignado = new Array<number>(n).fill(base);
  } else {
    asignado = pesos.map((p) => redondearCentimo((total * p) / suma));
  }

  const residuo = total - asignado.reduce((acc, c) => acc + c, 0);
  asignado[idxMax] = (asignado[idxMax] as number) + residuo;
  return asignado;
}
