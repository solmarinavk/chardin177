"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
import {
  centimosDesdeInput,
  enteroDesdeInput,
  type EstadoForm,
} from "@/lib/formularios";

function mensajeError(error: { code?: string; message: string }): string {
  if (error.code === "42501") return "No tienes permiso para esta acción.";
  return error.message;
}

function revalidar() {
  revalidatePath("/provisiones");
  revalidatePath("/inicio");
}

// 3.1 · Configurar el aporte mensual de una provisión (solo admin).
export async function configurarProvision(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["admin"]);
  const provisionId = enteroDesdeInput(formData.get("provision_id"));
  const aporte = centimosDesdeInput(formData.get("aporte"));
  const activo = String(formData.get("activo")) === "true";
  if (provisionId === null) return { ok: false, error: "Provisión inválida." };
  if (aporte === null) return { ok: false, error: "Aporte inválido." };

  const s = createClient();
  const { error } = await s
    .from("provisiones")
    .update({ aporte_mensual_cent: aporte, activo })
    .eq("id", provisionId);
  if (error) return { ok: false, error: mensajeError(error) };

  revalidar();
  return { ok: true, error: null, mensaje: "Provisión actualizada." };
}

// 3.1 · Registrar un movimiento manual: uso (negativo) o aporte extra (positivo).
export async function registrarMovimientoProvision(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["tesoreria", "admin"]);
  const provisionId = enteroDesdeInput(formData.get("provision_id"));
  const tipo = String(formData.get("tipo") ?? "uso"); // 'uso' | 'aporte'
  const monto = centimosDesdeInput(formData.get("monto"));
  const concepto = String(formData.get("concepto") ?? "").trim();
  if (provisionId === null) return { ok: false, error: "Provisión inválida." };
  if (monto === null || monto <= 0)
    return { ok: false, error: "El monto debe ser mayor a S/ 0." };
  if (concepto.length === 0)
    return { ok: false, error: "Escribe el concepto del movimiento." };

  const montoConSigno = tipo === "uso" ? -monto : monto;

  const s = createClient();
  const { error } = await s.from("movimientos_provision").insert({
    provision_id: provisionId,
    monto_cent: montoConSigno,
    concepto,
  });
  if (error) return { ok: false, error: mensajeError(error) };

  revalidar();
  return {
    ok: true,
    error: null,
    mensaje: tipo === "uso" ? "Uso registrado." : "Aporte registrado.",
  };
}
