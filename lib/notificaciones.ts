import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email";
import { formatoPEN } from "@/lib/centimos";
import { etiquetaPeriodo } from "@/lib/fechas";
import { lineasRecibo } from "@/lib/recibo";
import type { Cuota, Periodo } from "@/lib/periodos";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Cliente = SupabaseClient<Database>;

function htmlRecibo(periodo: Periodo, cuota: Cuota, saldoCent: number): string {
  const filas = lineasRecibo(cuota)
    .map(
      (l) =>
        `<tr><td style="padding:4px 0;color:#475569">${l.etiqueta}</td><td style="padding:4px 0;text-align:right">${formatoPEN(l.cent)}</td></tr>`,
    )
    .join("");
  return `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
    <h2 style="margin:0 0 4px">Chardin 177</h2>
    <p style="color:#64748b;margin:0 0 16px">Tu cuota de ${etiquetaPeriodo(periodo.anio, periodo.mes)} — Dpto ${cuota.dpto_id}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${filas}
      <tr><td style="padding:10px 0;font-weight:800;border-top:2px solid #e2e8f0">TOTAL</td>
          <td style="padding:10px 0;text-align:right;font-weight:800;border-top:2px solid #e2e8f0">${formatoPEN(cuota.total_cent)}</td></tr>
    </table>
    ${
      saldoCent > 0
        ? `<p style="color:#b91c1c;font-weight:700">Pendiente por pagar: ${formatoPEN(saldoCent)}</p>`
        : `<p style="color:#15803d;font-weight:700">Pagado ✅</p>`
    }
    <p style="color:#94a3b8;font-size:12px">Puedes ver el detalle y compartir tu recibo desde la plataforma del edificio.</p>
  </div>`;
}

async function pagadoPorCuota(s: Cliente, cuotaIds: number[]): Promise<Map<number, number>> {
  const mapa = new Map<number, number>();
  if (cuotaIds.length === 0) return mapa;
  const { data } = await s.from("pagos").select("cuota_id, monto_cent").in("cuota_id", cuotaIds);
  for (const p of data ?? []) mapa.set(p.cuota_id, (mapa.get(p.cuota_id) ?? 0) + p.monto_cent);
  return mapa;
}

// Envía a cada residente (con correo) su cuota. Best-effort: devuelve cuántos
// se enviaron. Usa el cliente pasado (la sesión de tesorería al emitir).
export async function notificarEmision(
  periodoId: number,
): Promise<{ enviados: number; sinConfigurar: boolean }> {
  const s = createClient();
  const [{ data: periodo }, { data: cuotas }, { data: residentes }] = await Promise.all([
    s.from("periodos").select("*").eq("id", periodoId).maybeSingle(),
    s.from("cuotas").select("*").eq("periodo_id", periodoId),
    s
      .from("residentes")
      .select("dpto_id, nombre, email")
      .eq("activo", true)
      .not("email", "is", null),
  ]);
  if (!periodo || !cuotas) return { enviados: 0, sinConfigurar: false };

  const pagado = await pagadoPorCuota(s, cuotas.map((c) => c.id));
  const porDpto = new Map(cuotas.map((c) => [c.dpto_id, c]));

  let enviados = 0;
  let sinConfigurar = false;
  for (const r of residentes ?? []) {
    const cuota = porDpto.get(r.dpto_id);
    if (!cuota || !r.email) continue;
    const saldo = cuota.total_cent - (pagado.get(cuota.id) ?? 0);
    const res = await enviarEmail(
      r.email,
      `Tu cuota de ${etiquetaPeriodo(periodo.anio, periodo.mes)} · Chardin 177`,
      htmlRecibo(periodo, cuota, saldo),
    );
    if (res.skipped) sinConfigurar = true;
    if (res.ok) enviados += 1;
  }
  return { enviados, sinConfigurar };
}

// Recordatorio a los pendientes del periodo emitido. Lo llama el cron del día 25
// (ruta /api/recordatorios), sin sesión de usuario → usa la service role.
export async function recordarPendientes(): Promise<{ enviados: number }> {
  const s = createAdminClient();
  const { data: periodo } = await s
    .from("periodos")
    .select("*")
    .eq("estado", "emitido")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!periodo) return { enviados: 0 };

  const { data: cuotas } = await s
    .from("cuotas")
    .select("*")
    .eq("periodo_id", periodo.id)
    .neq("estado", "pagado");
  if (!cuotas || cuotas.length === 0) return { enviados: 0 };

  const pagado = await pagadoPorCuota(s, cuotas.map((c) => c.id));
  const { data: residentes } = await s
    .from("residentes")
    .select("dpto_id, nombre, email")
    .eq("activo", true)
    .not("email", "is", null);
  const porDpto = new Map(cuotas.map((c) => [c.dpto_id, c]));

  let enviados = 0;
  for (const r of residentes ?? []) {
    const cuota = porDpto.get(r.dpto_id);
    if (!cuota || !r.email) continue;
    const saldo = cuota.total_cent - (pagado.get(cuota.id) ?? 0);
    if (saldo <= 0) continue;
    const res = await enviarEmail(
      r.email,
      `Recordatorio: tu cuota de ${etiquetaPeriodo(periodo.anio, periodo.mes)} · Chardin 177`,
      htmlRecibo(periodo, cuota, saldo),
    );
    if (res.ok) enviados += 1;
  }
  return { enviados };
}
