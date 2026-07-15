// Helpers de fecha en español peruano (America/Lima).

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function nombreMes(mes: number): string {
  return MESES[mes - 1] ?? String(mes);
}

function capitalizar(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}

// (2026, 7) → "Julio 2026"
export function etiquetaPeriodo(anio: number, mes: number): string {
  return `${capitalizar(nombreMes(mes))} ${anio}`;
}

// Fecha ISO o 'YYYY-MM-DD' → 'dd/mm/yyyy'. Para fechas simples no aplica zona
// horaria (evita el corrimiento de un día); para timestamps usa America/Lima.
export function formatoFecha(iso: string): string {
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (soloFecha) {
    const [, a, m, d] = soloFecha;
    return `${d}/${m}/${a}`;
  }
  const fecha = new Date(iso);
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

// Fecha de hoy en Lima como 'YYYY-MM-DD' (para valores por defecto de formularios).
export function hoyLima(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return partes; // en-CA da 'YYYY-MM-DD'
}
