"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
import { type EstadoForm } from "@/lib/formularios";
import { esCategoriaValida } from "@/lib/ocurrencias-cat";
import { BUCKET_OCURRENCIAS, archivoConContenido, subirFoto } from "@/lib/storage";

const MAX_FOTOS = 8;

// 6.2 · Registra una ocurrencia del cuaderno de portería, con sus fotos de
// evidencia. Si una foto falla, la ocurrencia se guarda igual (no se pierde el
// registro) y se avisa cuántas no subieron.
export async function registrarOcurrencia(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["porteria", "tesoreria", "admin"]);

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (titulo.length < 3)
    return { ok: false, error: "Escribe un título corto de lo que pasó (mínimo 3 letras)." };

  let categoria = String(formData.get("categoria") ?? "general").trim();
  if (!esCategoriaValida(categoria)) categoria = "general";

  const fechaRaw = String(formData.get("fecha") ?? "").trim();
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw) ? fechaRaw : undefined; // sin fecha → hoy (lo pone la BD)

  const detalle = String(formData.get("detalle") ?? "").trim() || null;

  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();

  const { data: oc, error } = await s
    .from("ocurrencias")
    .insert({
      titulo,
      categoria,
      detalle,
      creado_por: user?.id ?? null,
      ...(fecha ? { fecha } : {}),
    })
    .select("id")
    .single();

  if (error || !oc) {
    if (error?.code === "42501")
      return { ok: false, error: "No tienes permiso para registrar ocurrencias." };
    return { ok: false, error: error?.message ?? "No se pudo guardar la ocurrencia." };
  }

  const archivos = formData
    .getAll("fotos")
    .map((v) => archivoConContenido(v))
    .filter((f): f is File => f !== null)
    .slice(0, MAX_FOTOS);

  let subidas = 0;
  let fallidas = 0;
  for (const archivo of archivos) {
    const res = await subirFoto(BUCKET_OCURRENCIAS, `oc-${oc.id}`, archivo);
    if ("error" in res) {
      fallidas += 1;
      continue;
    }
    const { error: eFoto } = await s
      .from("ocurrencia_fotos")
      .insert({ ocurrencia_id: oc.id, ruta: res.ruta });
    if (eFoto) fallidas += 1;
    else subidas += 1;
  }

  revalidatePath("/ocurrencias");

  let mensaje = "Ocurrencia registrada";
  if (archivos.length > 0) mensaje += ` con ${subidas} foto${subidas === 1 ? "" : "s"}`;
  mensaje += ". ✓";
  if (fallidas > 0)
    mensaje += ` (${fallidas} foto${fallidas === 1 ? "" : "s"} no se pudo subir, inténtalo de nuevo).`;

  return { ok: true, error: null, mensaje };
}
