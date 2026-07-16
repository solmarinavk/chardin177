import { formatoPEN } from "@/lib/centimos";
import { etiquetaPeriodo } from "@/lib/fechas";
import type { Cuota } from "@/lib/periodos";

export type LineaRecibo = { etiqueta: string; cent: number };

// Desglose del recibo de un dpto (solo las líneas con monto ≠ 0 en extra/ajuste).
export function lineasRecibo(c: Cuota): LineaRecibo[] {
  const items: LineaRecibo[] = [
    { etiqueta: "Agua (consumo)", cent: c.agua_consumo_cent },
    { etiqueta: "Agua común", cent: c.agua_comun_cent },
    { etiqueta: "Luz común", cent: c.luz_cent },
    { etiqueta: "Vigilancia", cent: c.vigilancia_cent },
    { etiqueta: "Mantenimiento", cent: c.manto_cent },
    { etiqueta: "Materiales", cent: c.materiales_cent },
  ];
  if (c.extra_cent !== 0) items.push({ etiqueta: "Cuota extraordinaria", cent: c.extra_cent });
  if (c.ajuste_cent !== 0) items.push({ etiqueta: "Ajuste", cent: c.ajuste_cent });
  return items;
}

// Resumen del MES COMPLETO (los 10 dptos) para el grupo de WhatsApp del
// edificio. Formato pensado para WhatsApp: *negritas*, líneas cortas, sin
// tablas. El enlace a la página pública lo agrega el navegador al compartir.
export function textoResumenMes(
  anio: number,
  mes: number,
  cuotas: Cuota[],
  pagadoPorCuota: Map<number, number>,
  opciones: { vence?: boolean } = {},
): string {
  const orden = [...cuotas].sort((a, b) => a.dpto_id - b.dpto_id);

  const lineas = orden.map((c) => {
    const pagado = pagadoPorCuota.get(c.id) ?? (c.estado === "pagado" ? c.total_cent : 0);
    const saldo = c.total_cent - pagado;
    if (c.estado === "pagado")
      return `Dpto ${c.dpto_id}: ${formatoPEN(c.total_cent)} — PAGADO ✓`;
    if (c.estado === "parcial")
      return `Dpto ${c.dpto_id}: debe ${formatoPEN(saldo)} de ${formatoPEN(c.total_cent)} — PARCIAL`;
    return `Dpto ${c.dpto_id}: ${formatoPEN(c.total_cent)} — PENDIENTE`;
  });

  let recaudado = 0;
  for (const c of orden)
    recaudado += pagadoPorCuota.get(c.id) ?? (c.estado === "pagado" ? c.total_cent : 0);
  const esperado = orden.reduce((a, c) => a + c.total_cent, 0);
  const pagados = orden.filter((c) => c.estado === "pagado").length;
  const parciales = orden.filter((c) => c.estado === "parcial").length;
  const pendientes = orden.filter((c) => c.estado === "pendiente").length;

  const bloques = [
    `*CHARDIN 177 · Cuotas ${etiquetaPeriodo(anio, mes)}*`,
    "",
    lineas.join("\n"),
    "",
    `*Recaudado: ${formatoPEN(recaudado)} de ${formatoPEN(esperado)}*`,
    `✅ ${pagados} al día · 🟡 ${parciales} parcial${parciales === 1 ? "" : "es"} · 🔴 ${pendientes} pendiente${pendientes === 1 ? "" : "s"}`,
  ];
  if (opciones.vence) bloques.push("", "Vence: fin de mes.");
  bloques.push("", "Consulta el detalle en:");
  return bloques.join("\n");
}

// Texto plano del recibo para compartir por WhatsApp.
export function textoReciboWhatsApp(
  anio: number,
  mes: number,
  cuota: Cuota,
  pagadoCent: number,
): string {
  const saldo = cuota.total_cent - pagadoCent;
  const lineas = lineasRecibo(cuota)
    .map((l) => `• ${l.etiqueta}: ${formatoPEN(l.cent)}`)
    .join("\n");
  return [
    `*Chardin 177* — Recibo ${etiquetaPeriodo(anio, mes)}`,
    `Departamento ${cuota.dpto_id}`,
    "",
    lineas,
    "",
    `*TOTAL: ${formatoPEN(cuota.total_cent)}*`,
    saldo > 0
      ? `Pendiente por pagar: ${formatoPEN(saldo)}`
      : "Estado: Pagado ✅",
  ].join("\n");
}
