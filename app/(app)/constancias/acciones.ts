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
import {
  BUCKET_COMPROBANTES,
  archivoConContenido,
  subirFoto,
} from "@/lib/storage";
import type { MedioPago } from "@/lib/database.types";

function mensajeError(error: { code?: string; message: string }): string {
  if (error.code === "42501") return "No tienes permiso para esta acción.";
  return error.message;
}

// 3.7 · El vecino sube su constancia de pago (queda pendiente de confirmar).
export async function subirConstancia(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const perfil = await requireRol(["residente", "tesoreria", "admin"]);
  const periodoId = enteroDesdeInput(formData.get("periodo_id"));
  let dptoId = enteroDesdeInput(formData.get("dpto_id"));
  const monto = centimosDesdeInput(formData.get("monto")); // opcional
  const nota = String(formData.get("nota") ?? "").trim() || null;

  // Si el perfil está atado a un dpto, ese manda (no puede subir por otro).
  if (perfil.dpto_id != null) dptoId = perfil.dpto_id;

  if (periodoId === null) return { ok: false, error: "Periodo inválido." };
  if (dptoId === null)
    return { ok: false, error: "Elige tu departamento." };

  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();

  let foto_url: string | undefined;
  const archivo = archivoConContenido(formData.get("foto"));
  if (archivo) {
    const res = await subirFoto(
      BUCKET_COMPROBANTES,
      `constancia-periodo-${periodoId}-dpto-${dptoId}`,
      archivo,
    );
    if ("error" in res)
      return { ok: false, error: `No se pudo subir la foto: ${res.error}` };
    foto_url = res.ruta;
  }

  if (!foto_url && monto === null)
    return {
      ok: false,
      error: "Sube la foto de tu constancia o al menos indica el monto.",
    };

  const { error } = await s.from("constancias_pago").insert({
    periodo_id: periodoId,
    dpto_id: dptoId,
    monto_cent: monto,
    nota,
    creado_por: user?.id ?? null,
    ...(foto_url ? { foto_url } : {}),
  });
  if (error) return { ok: false, error: mensajeError(error) };

  revalidatePath("/estado-cuenta");
  return {
    ok: true,
    error: null,
    mensaje: "Constancia enviada. Tesorería la confirmará pronto.",
  };
}

// 3.7 · Tesorería confirma una constancia → crea el pago oficial.
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
