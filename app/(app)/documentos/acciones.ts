"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
import { type EstadoForm } from "@/lib/formularios";
import {
  BUCKET_DOCUMENTOS,
  archivoConContenido,
  subirFoto,
} from "@/lib/storage";

// Sube un documento del edificio al Storage y lo registra. tesorería/admin.
export async function subirDocumento(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["tesoreria", "admin"]);
  const titulo = String(formData.get("titulo") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const archivo = archivoConContenido(formData.get("archivo"));

  if (!titulo) return { ok: false, error: "Ponle un título al documento." };
  if (!archivo) return { ok: false, error: "Elige un archivo para subir." };

  const res = await subirFoto(BUCKET_DOCUMENTOS, "doc", archivo);
  if ("error" in res)
    return { ok: false, error: `No se pudo subir: ${res.error}` };

  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  const { error } = await s.from("documentos").insert({
    titulo,
    categoria,
    url: res.ruta,
    subido_por: user?.id ?? null,
  });
  if (error)
    return {
      ok: false,
      error: error.code === "42501" ? "No tienes permiso para esta acción." : error.message,
    };

  revalidatePath("/documentos");
  return { ok: true, error: null, mensaje: "Documento subido." };
}
