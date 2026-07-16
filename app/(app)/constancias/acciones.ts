"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
import { hoyLima } from "@/lib/fechas";
import {
  centimosDesdeInput,
  enteroDesdeInput,
  type EstadoForm,
} from "@/lib/formularios";
import type { MedioPago } from "@/lib/database.types";

function mensajeError(error: { code?: string; message: string }): string {
  if (error.code === "42501") return "No tienes permiso para esta acción.";
  return error.message;
}

// 3.7 · Tesorería confirma una constancia → crea el pago oficial.
// (Los vecinos ya no suben constancias por sí mismos: envían su comprobante por
// WhatsApp y tesorería registra el pago directamente en Cobranza. Esta acción
// sigue disponible para resolver constancias que existieran de antes.)
export async function confirmarConstancia(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["tesoreria", "admin"]);
  const constanciaId = enteroDesdeInput(formData.get("constancia_id"));
  const periodoId = enteroDesdeInput(formData.get("periodo_id"));
  const monto = centimosDesdeInput(formData.get("monto"));
  const medioRaw = String(formData.get("medio") ?? "transferencia");
  if (constanciaId === null) return { ok: false, error: "Constancia inválida." };
  if (monto === null || monto <= 0)
    return { ok: false, error: "Indica el monto a confirmar." };
  const medios: MedioPago[] = ["yape", "plin", "transferencia", "efectivo", "otro"];
  const medio = (medios.includes(medioRaw as MedioPago) ? medioRaw : "otro") as MedioPago;

  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();

  const { data: constancia } = await s
    .from("constancias_pago")
    .select("*")
    .eq("id", constanciaId)
    .maybeSingle();
  if (!constancia) return { ok: false, error: "No se encontró la constancia." };
  if (constancia.estado !== "pendiente")
    return { ok: false, error: "Esta constancia ya fue resuelta." };

  // Busca la cuota del dpto en ese periodo.
  const { data: cuota } = await s
    .from("cuotas")
    .select("id")
    .eq("periodo_id", constancia.periodo_id)
    .eq("dpto_id", constancia.dpto_id)
    .maybeSingle();
  if (!cuota)
    return { ok: false, error: "No hay cuota emitida para ese dpto todavía." };

  const { data: pago, error: errPago } = await s
    .from("pagos")
    .insert({
      cuota_id: cuota.id,
      monto_cent: monto,
      fecha_pago: hoyLima(),
      medio,
      nota: "Confirmación de constancia del vecino",
      ...(constancia.foto_url ? { comprobante_url: constancia.foto_url } : {}),
    })
    .select("id")
    .single();
  if (errPago) return { ok: false, error: mensajeError(errPago) };

  const { error: errUpd } = await s
    .from("constancias_pago")
    .update({
      estado: "confirmada",
      resuelto_por: user?.id ?? null,
      resuelto_en: new Date().toISOString(),
      pago_id: pago.id,
    })
    .eq("id", constanciaId);
  if (errUpd) return { ok: false, error: mensajeError(errUpd) };

  if (periodoId !== null) revalidatePath(`/periodos/${periodoId}`);
  return { ok: true, error: null, mensaje: "Constancia confirmada y pago registrado." };
}

// 3.7 · Tesorería rechaza una constancia (ej. ilegible o duplicada).
export async function rechazarConstancia(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["tesoreria", "admin"]);
  const constanciaId = enteroDesdeInput(formData.get("constancia_id"));
  const periodoId = enteroDesdeInput(formData.get("periodo_id"));
  if (constanciaId === null) return { ok: false, error: "Constancia inválida." };

  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  const { error } = await s
    .from("constancias_pago")
    .update({
      estado: "rechazada",
      resuelto_por: user?.id ?? null,
      resuelto_en: new Date().toISOString(),
    })
    .eq("id", constanciaId)
    .eq("estado", "pendiente");
  if (error) return { ok: false, error: mensajeError(error) };

  if (periodoId !== null) revalidatePath(`/periodos/${periodoId}`);
  return { ok: true, error: null, mensaje: "Constancia rechazada." };
}
