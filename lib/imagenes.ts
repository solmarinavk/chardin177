// Compresión de fotos EN EL NAVEGADOR, antes de subirlas.
//
// Por qué: una foto de cámara de celular pesa 3–5 MB. Un Server Action de Next
// acepta 1 MB por defecto y Netlify corta la petición alrededor de 6 MB, así
// que subir varias fotos hacía reventar el formulario con "Application error".
// Redimensionar el lado mayor a 1600 px y re-comprimir a JPEG deja cada foto en
// ~200–400 KB: entra de sobra y además sube mucho más rápido con datos móviles.
//
// Regla de oro de este módulo: es "best-effort". Ante CUALQUIER problema se
// devuelve el archivo original — es preferible subir una foto pesada que perder
// la evidencia del portero.

export const LADO_MAX = 1600;
export const CALIDAD = 0.82;

// Tope práctico de lo que puede viajar en un envío. Va por debajo del
// bodySizeLimit de Next (5 MB) y del corte de Netlify (~6 MB), para poder
// avisar con un mensaje claro ANTES de que el envío falle.
export const LIMITE_SUBIDA_BYTES = 4.5 * 1024 * 1024;

export function pesoTotal(archivos: { size: number }[]): number {
  return archivos.reduce((suma, a) => suma + a.size, 0);
}

export function excedeLimite(archivos: { size: number }[]): boolean {
  return pesoTotal(archivos) > LIMITE_SUBIDA_BYTES;
}

// "3.2 MB" — para decirle a la persona cuánto pesa lo que eligió.
export function enMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Parte pura (testeable): dimensiones destino conservando la proporción.
// Si la imagen ya es chica, se deja igual.
export function dimensionesDestino(
  ancho: number,
  alto: number,
  ladoMax = LADO_MAX,
): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto);
  if (mayor <= ladoMax || mayor <= 0) return { ancho, alto };
  const factor = ladoMax / mayor;
  return {
    ancho: Math.max(1, Math.round(ancho * factor)),
    alto: Math.max(1, Math.round(alto * factor)),
  };
}

// Comprime una imagen. Devuelve el original si no se puede (formato que el
// navegador no decodifica —p. ej. algunos HEIC de iPhone—, canvas bloqueado,
// o si el resultado no pesa menos).
export async function comprimirImagen(archivo: File): Promise<File> {
  if (typeof window === "undefined") return archivo;
  if (!archivo.type.startsWith("image/")) return archivo;

  try {
    // `imageOrientation: "from-image"` respeta el EXIF: sin esto, las fotos
    // tomadas en vertical se guardan giradas.
    const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const { ancho, alto } = dimensionesDestino(bitmap.width, bitmap.height);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolver) =>
      lienzo.toBlob(resolver, "image/jpeg", CALIDAD),
    );
    if (!blob || blob.size >= archivo.size) return archivo; // no mejoró

    const nombre = archivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return archivo;
  }
}

// Reemplaza los archivos de un <input type="file"> por los ya comprimidos, para
// que el formulario los envíe tal cual. Devuelve false si el navegador no
// soporta DataTransfer (entonces se suben los originales).
export function ponerArchivosEnInput(
  input: HTMLInputElement,
  archivos: File[],
): boolean {
  try {
    const dt = new DataTransfer();
    for (const a of archivos) dt.items.add(a);
    input.files = dt.files;
    return true;
  } catch {
    return false;
  }
}
