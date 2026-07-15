import { createClient } from "@/lib/supabase/server";

// Buckets privados creados en Supabase.
export const BUCKET_MEDIDORES = "medidores";
export const BUCKET_COMPROBANTES = "comprobantes";
export const BUCKET_DOCUMENTOS = "documentos";

function extensionDe(archivo: File): string {
  const punto = archivo.name.lastIndexOf(".");
  return punto >= 0 ? archivo.name.slice(punto + 1).toLowerCase() : "jpg";
}

// Sube un archivo a un bucket privado. Devuelve la ruta guardada o un error.
// El nombre se hace único con un UUID.
export async function subirFoto(
  bucket: string,
  prefijo: string,
  archivo: File,
): Promise<{ ruta: string } | { error: string }> {
  const s = createClient();
  const ruta = `${prefijo}-${crypto.randomUUID()}.${extensionDe(archivo)}`;
  // upsert:false — la ruta es única (UUID) y la política de storage solo
  // permite INSERT, no UPDATE.
  const { data, error } = await s.storage.from(bucket).upload(ruta, archivo, {
    upsert: false,
    contentType: archivo.type || undefined,
  });
  if (error) return { error: error.message };
  return { ruta: data.path };
}

// URL firmada temporal para mostrar una foto de un bucket privado.
export async function urlFirmada(
  bucket: string,
  ruta: string,
  segundos = 3600,
): Promise<string | null> {
  const s = createClient();
  const { data } = await s.storage.from(bucket).createSignedUrl(ruta, segundos);
  return data?.signedUrl ?? null;
}

// ¿El FormData trae un archivo con contenido?
export function archivoConContenido(valor: FormDataEntryValue | null): File | null {
  if (valor && typeof valor === "object" && "size" in valor && valor.size > 0) {
    return valor as File;
  }
  return null;
}
