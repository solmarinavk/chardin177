"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
import { getBorrador } from "@/lib/periodos";
import { getConciliacionPreview } from "@/lib/caja";
import { etiquetaPeriodo } from "@/lib/fechas";
import {
  centimosDesdeInput,
  enteroDesdeInput,
  type EstadoForm,
} from "@/lib/formularios";

// 3.3 · Aplica el cuadre de agua: genera AJUSTES (origen='conciliacion_agua')
// en el borrador actual y registra la conciliación. Recomputa en el servidor
// (no confía en los montos del cliente).
export async function aplicarConciliacion(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["tesoreria", "admin"]);
  const desdeId = enteroDesdeInput(formData.get("desde"));
  const hastaId = enteroDesdeInput(formData.get("hasta"));
  const facturado = centimosDesdeInput(formData.get("facturado"));
  if (desdeId === null || hastaId === null)
    return { ok: false, error: "Selecciona el rango de meses." };
  if (facturado === null)
    return { ok: false, error: "Ingresa el total facturado por Sedapal." };

  const preview = await getConciliacionPreview(desdeId, hastaId, facturado);
  if (!preview || preview.periodos.length === 0)
    return { ok: false, error: "No hay periodos emitidos/cerrados en ese rango." };

  const borrador = await getBorrador();
  if (!borrador)
    return {
      ok: false,
      error:
        "Necesitas un periodo en borrador para aplicar los ajustes. Crea el mes en Periodos.",
    };

  const primero = preview.periodos[0]!;
  const ultimo = preview.periodos[preview.periodos.length - 1]!;
  const concepto = `Cuadre de agua ${etiquetaPeriodo(primero.anio, primero.mes)} – ${etiquetaPeriodo(ultimo.anio, ultimo.mes)}`;

  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();

  const filas = preview.porDpto
    .filter((x) => x.ajusteCent !== 0)
    .map((x) => ({
      periodo_id: borrador.id,
      dpto_id: x.dpto,
      concepto,
      monto_cent: x.ajusteCent,
      origen: "conciliacion_agua",
      creado_por: user?.id ?? null,
    }));

  if (filas.length > 0) {
    const { error } = await s.from("ajustes").insert(filas);
    if (error) return { ok: false, error: error.message };
  }

  const { error: errC } = await s.from("conciliaciones_agua").insert({
    periodo_desde: desdeId,
    periodo_hasta: hastaId,
    facturado_real_cent: facturado,
    cobrado_cent: preview.cobradoCent,
    aplicada: true,
    notas: concepto,
  });
  if (errC) return { ok: false, error: errC.message };

  revalidatePath(`/periodos/${borrador.id}`);
  revalidatePath("/conciliacion");
  return {
    ok: true,
    error: null,
    mensaje: `Ajustes aplicados al borrador (${etiquetaPeriodo(borrador.anio, borrador.mes)}). Recalcula las cuotas para incluirlos.`,
  };
}
