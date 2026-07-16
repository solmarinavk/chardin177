"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
import { getPeriodo, getLecturasAnteriores } from "@/lib/periodos";
import { enteroDesdeInput, type EstadoForm } from "@/lib/formularios";
import { BUCKET_MEDIDORES, archivoConContenido, subirFoto } from "@/lib/storage";
import type { Database } from "@/lib/database.types";

type LecturaInsert = Database["public"]["Tables"]["lecturas_agua"]["Insert"];

// 5.4c · Autoguardado de UNA lectura al salir del campo, para no perder lo
// avanzado si se corta el internet a mitad. La foto y la confirmación final
// siguen yendo por el botón Guardar. La lectura anterior la deriva el servidor
// (misma regla que el guardado normal: nunca se digita si hay mes previo).
export async function autoguardarLectura(
  periodoId: number,
  dpto: number,
  actual: number,
): Promise<{ ok: boolean; error?: string }> {
  await requireRol(["porteria", "tesoreria", "admin"]);
  if (!Number.isInteger(periodoId) || !Number.isInteger(dpto) || !Number.isInteger(actual) || actual < 0)
    return { ok: false, error: "Lectura inválida." };

  const periodo = await getPeriodo(periodoId);
  if (!periodo || periodo.estado !== "borrador")
    return { ok: false, error: "Este mes ya no acepta lecturas." };

  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();

  const anteriores = await getLecturasAnteriores(periodo.anio, periodo.mes);
  let anterior = anteriores.get(dpto);
  if (anterior === undefined) {
    // Primer mes: conserva la anterior ya guardada de este mismo periodo (si
    // hay); si no, no se puede autoguardar sin ese dato — que use el botón.
    const { data: previa } = await s
      .from("lecturas_agua")
      .select("lectura_anterior")
      .eq("periodo_id", periodoId)
      .eq("dpto_id", dpto)
      .maybeSingle();
    if (!previa) return { ok: false, error: "Completa también la lectura anterior y usa Guardar." };
    anterior = previa.lectura_anterior;
  }
  if (actual < anterior)
    return {
      ok: false,
      error: `La actual (${actual}) no puede ser menor que la anterior (${anterior}).`,
    };

  const { error } = await s.from("lecturas_agua").upsert(
    {
      periodo_id: periodoId,
      dpto_id: dpto,
      lectura_anterior: anterior,
      lectura_actual: actual,
      registrado_por: user?.id ?? null,
    },
    { onConflict: "periodo_id,dpto_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/periodos/${periodoId}`);
  return { ok: true };
}

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

  // La lectura anterior NUNCA se digita (regla 1 de la matriz): el servidor la
  // deriva del mes pasado. Solo se toma del formulario en el primer mes (o un
  // dpto sin historial), donde se carga la base una vez.
  const periodo = await getPeriodo(periodoId);
  if (!periodo) return { ok: false, error: "Periodo inválido." };
  const anteriores = await getLecturasAnteriores(periodo.anio, periodo.mes);

  const filas: LecturaInsert[] = [];
  let omitidas = 0;
  for (const dpto of dptos) {
    const actualRaw = formData.get(`actual_${dpto}`);
    if (actualRaw === null || String(actualRaw).trim() === "") {
      omitidas += 1; // casilla vacía: se guarda después, no es error
      continue;
    }
    const derivada = anteriores.get(dpto);
    const anterior =
      derivada !== undefined
        ? derivada // hay mes previo: la impone el servidor, no el cliente
        : enteroDesdeInput(formData.get(`anterior_${dpto}`)); // primer mes
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
