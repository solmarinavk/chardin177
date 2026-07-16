import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Auditoria = Tables<"audit_log">;

// Tablas con trigger de auditoría (regla 6 de CLAUDE.md).
export const TABLAS_AUDITADAS = [
  "pagos",
  "egresos",
  "cuotas",
  "lecturas_agua",
  "perfiles",
  "cuotas_fijas",
  "ajustes",
  "recibos_servicios",
  "constancias_pago",
] as const;

export type FiltroBitacora = {
  tabla?: string | null;
  accion?: string | null;
  desde?: string | null; // 'YYYY-MM-DD'
  hasta?: string | null; // 'YYYY-MM-DD'
};

// Últimos movimientos de la bitácora (solo admin, por RLS sel_audit).
export async function getBitacora(
  filtro: FiltroBitacora = {},
  limite = 200,
): Promise<Auditoria[]> {
  const s = createClient();
  let q = s.from("audit_log").select("*").order("id", { ascending: false }).limit(limite);
  if (filtro.tabla) q = q.eq("tabla", filtro.tabla);
  if (filtro.accion) q = q.eq("accion", filtro.accion);
  if (filtro.desde) q = q.gte("creado_en", filtro.desde);
  if (filtro.hasta) q = q.lte("creado_en", `${filtro.hasta}T23:59:59.999Z`);
  const { data } = await q;
  return data ?? [];
}

// Nombres de campo que cambiaron entre `antes` y `despues` (para un UPDATE).
export function camposCambiados(antes: unknown, despues: unknown): string[] {
  if (
    !antes ||
    !despues ||
    typeof antes !== "object" ||
    typeof despues !== "object"
  )
    return [];
  const a = antes as Record<string, unknown>;
  const d = despues as Record<string, unknown>;
  const claves = new Set([...Object.keys(a), ...Object.keys(d)]);
  const cambios: string[] = [];
  for (const k of claves) {
    if (JSON.stringify(a[k]) !== JSON.stringify(d[k])) cambios.push(k);
  }
  return cambios;
}

// Resumen legible de una fila de bitácora.
export function resumenAuditoria(fila: Auditoria): string {
  const t = fila.tabla;
  if (fila.accion === "INSERT") return `Creó un registro en ${t}`;
  if (fila.accion === "DELETE") return `Eliminó un registro de ${t}`;
  const campos = camposCambiados(fila.antes, fila.despues).filter(
    (c) => c !== "id",
  );
  if (campos.length === 0) return `Actualizó ${t}`;
  return `Cambió ${campos.join(", ")} en ${t}`;
}
