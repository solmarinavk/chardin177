"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
import { enteroDesdeInput, type EstadoForm } from "@/lib/formularios";
import { BUCKET_MEDIDORES, archivoConContenido, subirFoto } from "@/lib/storage";
import type { Database } from "@/lib/database.types";

type LecturaInsert = Database["public"]["Tables"]["lecturas_agua"]["Insert"];

// 1.2 · Guardar las lecturas del periodo en borrador. Acepta guardado PARCIAL:
// el portero puede subir piso por piso; los dptos con la casilla vacía se
// omiten sin perder lo ya guardado.
export async function guardarLecturas(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["porteria", "tesoreria", "admin"]);

  const periodoId = enteroDesdeInput(formData.get("periodo_id"));
  if (periodoId === null) return { ok: false, error: "Periodo inválido." };

  const dptos = String(formData.get("dptos") ?? "")
    .split(",")
    .map((x) => Number(x))
    .filter((x) => Number.isInteger(x));
  if (dptos.length === 0) return { ok: false, error: "No hay departamentos." };

  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();

  const filas: LecturaInsert[] = [];
  let omitidas = 0;
  for (const dpto of dptos) {
    const actualRaw = formData.get(`actual_${dpto}`);
    if (actualRaw === null || String(actualRaw).trim() === "") {
      omitidas += 1; // casilla vacía: se guarda después, no es error
      continue;
    }
    const anterior = enteroDesdeInput(formData.get(`anterior_${dpto}`));
    const actual = enteroDesdeInput(actualRaw);
    if (anterior === null || anterior < 0)
      return { ok: false, error: `Lectura anterior inválida en el dpto ${dpto}.` };
    if (actual === null)
      return { ok: false, error: `Lectura actual inválida en el dpto ${dpto}.` };
    if (actual < anterior)
      return {
        ok: false,
        error: `Dpto ${dpto}: la lectura actual (${actual}) no puede ser menor que la anterior (${anterior}).`,
      };

    let foto_url: string | undefined;
    const archivo = archivoConContenido(formData.get(`foto_${dpto}`));
    if (archivo) {
      const res = await subirFoto(
        BUCKET_MEDIDORES,
        `periodo-${periodoId}-dpto-${dpto}`,
        archivo,
      );
      if ("error" in res)
        return { ok: false, error: `Foto del dpto ${dpto}: ${res.error}` };
      foto_url = res.ruta;
    }

    filas.push({
      periodo_id: periodoId,
      dpto_id: dpto,
      lectura_anterior: anterior,
      lectura_actual: actual,
      registrado_por: user?.id ?? null,
      ...(foto_url ? { foto_url } : {}),
    });
  }

  if (filas.length === 0)
    return { ok: false, error: "Ingresa al menos una lectura antes de guardar." };

  const { error } = await s
    .from("lecturas_agua")
    .upsert(filas, { onConflict: "periodo_id,dpto_id" });
  if (error) {
    if (error.code === "42501")
      return { ok: false, error: "No tienes permiso para registrar lecturas." };
    return { ok: false, error: error.message };
  }

  revalidatePath(`/periodos/${periodoId}`);
  revalidatePath("/lecturas");
  return {
    ok: true,
    error: null,
    mensaje:
      omitidas > 0
        ? `Se guardaron ${filas.length} lectura${filas.length === 1 ? "" : "s"}. Faltan ${omitidas}.`
        : "¡Las 10 lecturas quedaron guardadas! 🎉",
  };
}
