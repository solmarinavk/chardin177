"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
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
import type { MedioPago, TipoRecibo } from "@/lib/database.types";

const TESORERIA: ("tesoreria" | "admin")[] = ["tesoreria", "admin"];

function mensajeError(error: { code?: string; message: string }): string {
  if (error.code === "42501") return "No tienes permiso para esta acción.";
  return error.message;
}

// 1.1 · Crear un periodo (solo puede haber un borrador a la vez, lo garantiza la DB).
export async function crearPeriodo(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(TESORERIA);
  const anio = enteroDesdeInput(formData.get("anio"));
  const mes = enteroDesdeInput(formData.get("mes"));
  if (anio === null || anio < 2020 || anio > 2100)
    return { ok: false, error: "Año inválido." };
  if (mes === null || mes < 1 || mes > 12)
    return { ok: false, error: "Mes inválido (1 a 12)." };

  const s = createClient();
  const { data, error } = await s
    .from("periodos")
    .insert({ anio, mes, estado: "borrador" })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505")
      return {
        ok: false,
        error:
          "Ya existe un periodo en borrador, o ese mes ya fue creado. Emite o cierra el borrador actual antes de crear otro.",
      };
    return { ok: false, error: mensajeError(error) };
  }

  revalidatePath("/periodos");
  redirect(`/periodos/${data.id}`);
}

// 1.3 · Guardar el monto de un recibo (agua o luz) del periodo, con foto opcional.
export async function guardarRecibo(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(TESORERIA);
  const periodoId = enteroDesdeInput(formData.get("periodo_id"));
  const tipoRaw = String(formData.get("tipo") ?? "");
  const monto = centimosDesdeInput(formData.get("monto"));
  if (periodoId === null) return { ok: false, error: "Periodo inválido." };
  if (tipoRaw !== "agua" && tipoRaw !== "luz")
    return { ok: false, error: "Tipo de recibo inválido." };
  if (monto === null) return { ok: false, error: "Monto inválido." };
  const tipo = tipoRaw as TipoRecibo;

  const s = createClient();

  let foto_url: string | undefined;
  const archivo = archivoConContenido(formData.get("foto"));
  if (archivo) {
    const res = await subirFoto(
      BUCKET_COMPROBANTES,
      `recibo-${tipo}-periodo-${periodoId}`,
      archivo,
    );
    if ("error" in res)
      return { ok: false, error: `No se pudo subir la foto: ${res.error}` };
    foto_url = res.ruta;
  }

  const { error } = await s.from("recibos_servicios").upsert(
    {
      periodo_id: periodoId,
      tipo,
      monto_cent: monto,
      ...(foto_url ? { foto_url } : {}),
    },
    { onConflict: "periodo_id,tipo" },
  );
  if (error) return { ok: false, error: mensajeError(error) };

  revalidatePath(`/periodos/${periodoId}`);
  return { ok: true, error: null, mensaje: `Recibo de ${tipo} guardado.` };
}

// 1.4 · Calcular las cuotas (motor en Postgres). Solo en borrador.
export async function generarCuotas(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(TESORERIA);
  const periodoId = enteroDesdeInput(formData.get("periodo_id"));
  if (periodoId === null) return { ok: false, error: "Periodo inválido." };

  const s = createClient();
  const { error } = await s.rpc("generar_cuotas", { p_periodo: periodoId });
  if (error) return { ok: false, error: mensajeError(error) };

  revalidatePath(`/periodos/${periodoId}`);
  return { ok: true, error: null, mensaje: "Cuotas calculadas. Revisa el borrador." };
}

// 1.6 · Emitir el periodo (congela las cuotas, inmutable en adelante).
export async function emitirPeriodo(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(TESORERIA);
  const periodoId = enteroDesdeInput(formData.get("periodo_id"));
  if (periodoId === null) return { ok: false, error: "Periodo inválido." };

  const s = createClient();
  const { error } = await s.rpc("emitir_periodo", { p_periodo: periodoId });
  if (error) return { ok: false, error: mensajeError(error) };

  revalidatePath(`/periodos/${periodoId}`);
  return { ok: true, error: null, mensaje: "Periodo emitido." };
}

// 1.7 · Registrar un pago de una cuota (soporta pago parcial), con comprobante opcional.
export async function registrarPago(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(TESORERIA);
  const cuotaId = enteroDesdeInput(formData.get("cuota_id"));
  const periodoId = enteroDesdeInput(formData.get("periodo_id"));
  const monto = centimosDesdeInput(formData.get("monto"));
  const fecha = String(formData.get("fecha") ?? "");
  const medioRaw = String(formData.get("medio") ?? "transferencia");
  const nota = String(formData.get("nota") ?? "").trim() || null;

  if (cuotaId === null) return { ok: false, error: "Cuota inválida." };
  if (monto === null || monto <= 0)
    return { ok: false, error: "El monto debe ser mayor a S/ 0." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    return { ok: false, error: "Fecha inválida." };
  const medios: MedioPago[] = ["yape", "plin", "transferencia", "efectivo", "otro"];
  if (!medios.includes(medioRaw as MedioPago))
    return { ok: false, error: "Medio de pago inválido." };
  const medio = medioRaw as MedioPago;

  const s = createClient();

  let comprobante_url: string | undefined;
  const archivo = archivoConContenido(formData.get("comprobante"));
  if (archivo) {
    const res = await subirFoto(
      BUCKET_COMPROBANTES,
      `pago-cuota-${cuotaId}`,
      archivo,
    );
    if ("error" in res)
      return { ok: false, error: `No se pudo subir el comprobante: ${res.error}` };
    comprobante_url = res.ruta;
  }

  const { error } = await s.from("pagos").insert({
    cuota_id: cuotaId,
    monto_cent: monto,
    fecha_pago: fecha,
    medio,
    nota,
    ...(comprobante_url ? { comprobante_url } : {}),
  });
  if (error) return { ok: false, error: mensajeError(error) };

  if (periodoId !== null) revalidatePath(`/periodos/${periodoId}`);
  return { ok: true, error: null, mensaje: "Pago registrado." };
}
