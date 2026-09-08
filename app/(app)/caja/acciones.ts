"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
import {
  centimosDesdeInput,
  enteroDesdeInput,
  type EstadoForm,
} from "@/lib/formularios";
import { formatoPEN } from "@/lib/centimos";
import { formatoFecha } from "@/lib/fechas";
import {
  esDireccionCorreccion,
  montoCorreccionCent,
  conceptoCorreccion,
} from "@/lib/duplicados";
import {
  BUCKET_COMPROBANTES,
  archivoConContenido,
  subirFoto,
} from "@/lib/storage";

const TESORERIA: ("tesoreria" | "admin")[] = ["tesoreria", "admin"];

function mensajeError(error: { code?: string; message: string }): string {
  if (error.code === "42501") return "No tienes permiso para esta acción.";
  return error.message;
}

function revalidarCaja() {
  revalidatePath("/caja");
  revalidatePath("/inicio");
}

// 2.1 · Registrar un egreso (concepto, categoría, monto, fecha, comprobante, pagado).
export async function crearEgreso(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(TESORERIA);
  const periodoId = enteroDesdeInput(formData.get("periodo_id"));
  const concepto = String(formData.get("concepto") ?? "").trim();
  const categoriaId = enteroDesdeInput(formData.get("categoria_id"));
  const monto = centimosDesdeInput(formData.get("monto"));
  const fecha = String(formData.get("fecha") ?? "");
  const pagado = formData.get("pagado") === "on";

  if (periodoId === null) return { ok: false, error: "Periodo inválido." };
  if (concepto.length === 0)
    return { ok: false, error: "Escribe el concepto del gasto." };
  if (monto === null || monto <= 0)
    return { ok: false, error: "El monto debe ser mayor a S/ 0." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    return { ok: false, error: "Fecha inválida." };

  const s = createClient();

  // Aviso de doble registro. Va ANTES de subir el comprobante: si se pide
  // confirmación no queremos dejar un archivo huérfano en el storage.
  if (formData.get("confirmar_duplicado") !== "on") {
    const { data: iguales } = await s
      .from("egresos")
      .select("concepto")
      .eq("periodo_id", periodoId)
      .eq("monto_cent", monto)
      .eq("fecha", fecha)
      .limit(1);
    const yaExiste = iguales?.[0];
    if (yaExiste) {
      return {
        ok: false,
        error: null,
        confirmar:
          `Ya hay un gasto de ${formatoPEN(monto)} con fecha ${formatoFecha(fecha)}: «${yaExiste.concepto}». ` +
          `Si estás registrando ese mismo pago otra vez, no sigas. Si de verdad es un pago distinto, marca la casilla y vuelve a darle a Registrar.`,
      };
    }
  }

  let comprobante_url: string | undefined;
  const archivo = archivoConContenido(formData.get("comprobante"));
  if (archivo) {
    const res = await subirFoto(
      BUCKET_COMPROBANTES,
      `egreso-periodo-${periodoId}`,
      archivo,
    );
    if ("error" in res)
      return { ok: false, error: `No se pudo subir el comprobante: ${res.error}` };
    comprobante_url = res.ruta;
  }

  const { data: creado, error } = await s
    .from("egresos")
    .insert({
      periodo_id: periodoId,
      concepto,
      categoria_id: categoriaId,
      monto_cent: monto,
      fecha,
      pagado,
      ...(comprobante_url ? { comprobante_url } : {}),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: mensajeError(error) };

  revalidarCaja();
  return {
    ok: true,
    error: null,
    mensaje: "Egreso registrado.",
    hecho: {
      id: creado.id,
      detalle: `${concepto} · ${formatoPEN(monto)} · ${formatoFecha(fecha)}${pagado ? "" : " · por pagar"}`,
    },
  };
}

// 6.6 · Corregir un error de un mes YA CERRADO.
//
// Un mes cerrado es inmutable: el gasto mal registrado no se puede borrar ni
// editar (lo impide `fn_bloquea_egreso_cerrado`, y está bien). La corrección va
// como una línea nueva en el mes abierto, visible en el libro y en la vista
// pública. Devolver plata a la caja se guarda como egreso negativo.
export async function crearCorreccion(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(TESORERIA);
  const periodoId = enteroDesdeInput(formData.get("periodo_id"));
  const concepto = String(formData.get("concepto") ?? "").trim();
  const categoriaId = enteroDesdeInput(formData.get("categoria_id"));
  const monto = centimosDesdeInput(formData.get("monto"));
  const fecha = String(formData.get("fecha") ?? "");
  const direccion = formData.get("direccion");

  if (periodoId === null) return { ok: false, error: "Periodo inválido." };
  if (concepto.length === 0)
    return { ok: false, error: "Explica qué se está corrigiendo." };
  if (monto === null || monto <= 0)
    return { ok: false, error: "El monto debe ser mayor a S/ 0." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    return { ok: false, error: "Fecha inválida." };
  if (!esDireccionCorreccion(direccion))
    return { ok: false, error: "Elige si la plata vuelve o sale de la caja." };

  const s = createClient();
  const { error } = await s.from("egresos").insert({
    periodo_id: periodoId,
    concepto: conceptoCorreccion(concepto),
    categoria_id: categoriaId,
    monto_cent: montoCorreccionCent(direccion, monto),
    fecha,
    pagado: true,
  });
  if (error) return { ok: false, error: mensajeError(error) };

  revalidarCaja();
  return {
    ok: true,
    error: null,
    mensaje:
      direccion === "devolver"
        ? `Corrección registrada: vuelven ${formatoPEN(monto)} a la caja.`
        : `Corrección registrada: salen ${formatoPEN(monto)} de la caja.`,
  };
}

// 2.1 · Marcar un egreso como pagado / por pagar (los no pagados no entran a caja).
export async function marcarEgreso(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(TESORERIA);
  const egresoId = enteroDesdeInput(formData.get("egreso_id"));
  const pagado = String(formData.get("pagado")) === "true";
  if (egresoId === null) return { ok: false, error: "Egreso inválido." };

  const s = createClient();
  const { error } = await s
    .from("egresos")
    .update({ pagado })
    .eq("id", egresoId);
  if (error) return { ok: false, error: mensajeError(error) };

  revalidarCaja();
  return {
    ok: true,
    error: null,
    mensaje: pagado ? "Marcado como pagado." : "Marcado como por pagar.",
  };
}

// 2.1 · Anular un egreso registrado por error (queda en la bitácora).
export async function anularEgreso(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(TESORERIA);
  const egresoId = enteroDesdeInput(formData.get("egreso_id"));
  if (egresoId === null) return { ok: false, error: "Egreso inválido." };

  const s = createClient();
  const { error, count } = await s
    .from("egresos")
    .delete({ count: "exact" })
    .eq("id", egresoId);
  if (error) return { ok: false, error: mensajeError(error) };
  if (count === 0)
    return { ok: false, error: "No se encontró el egreso (¿ya fue anulado?)." };

  revalidarCaja();
  return { ok: true, error: null, mensaje: "Egreso anulado." };
}
