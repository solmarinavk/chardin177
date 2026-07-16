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
