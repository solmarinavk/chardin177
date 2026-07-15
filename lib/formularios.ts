// Estado compartido para formularios con useFormState.
export type EstadoForm = { ok: boolean; error: string | null; mensaje?: string };

export const ESTADO_INICIAL: EstadoForm = { ok: false, error: null };

// Convierte el texto de un input numérico (soles, con punto decimal) a céntimos.
// Devuelve null si no es un número válido o es negativo.
export function centimosDesdeInput(valor: FormDataEntryValue | null): number | null {
  if (valor === null) return null;
  const n = Number(String(valor).trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function enteroDesdeInput(valor: FormDataEntryValue | null): number | null {
  if (valor === null) return null;
  const n = Number(String(valor).trim());
  if (!Number.isInteger(n)) return null;
  return n;
}
