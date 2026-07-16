"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
import { centimosDesdeInput, type EstadoForm } from "@/lib/formularios";

// Guarda una NUEVA versión de las cuotas fijas (nunca edita las anteriores: son
// inmutables). El motor tomará la vigente para cada periodo que se calcule.
// Solo admin (RLS w_fijas). La escritura queda en audit_log por el trigger.
export async function guardarCuotaFija(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["admin"]);

  const vigenteDesde = String(formData.get("vigente_desde") ?? "").trim();
  const vigilancia = centimosDesdeInput(formData.get("vigilancia_total"));
  const manto = centimosDesdeInput(formData.get("manto_total"));
  const materiales = centimosDesdeInput(formData.get("materiales_dpto"));
  const aguaComun = centimosDesdeInput(formData.get("agua_comun_dpto"));
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigenteDesde))
    return { ok: false, error: "Elige la fecha desde la que rige." };
  if (vigilancia === null || manto === null || materiales === null || aguaComun === null)
    return { ok: false, error: "Completa todos los montos (no pueden ser negativos)." };

  const s = createClient();
  const { error } = await s.from("cuotas_fijas").insert({
    vigente_desde: vigenteDesde,
    vigilancia_total_cent: vigilancia,
    manto_total_cent: manto,
    materiales_dpto_cent: materiales,
    agua_comun_dpto_cent: aguaComun,
    notas,
  });
  if (error)
    return {
      ok: false,
      error: error.code === "42501" ? "No tienes permiso para esta acción." : error.message,
    };

  revalidatePath("/cuotas-fijas");
  return {
    ok: true,
    error: null,
    mensaje: "Nueva versión guardada. Rige para los meses que se calculen desde esa fecha; los ya emitidos no cambian.",
  };
}
