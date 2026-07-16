import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { construirLibro, nombreArchivo, type HojaExcel } from "@/lib/exportar";
import {
  armarHojas,
  TIPOS_DATO_PUBLICO,
  type OpcionesExport,
  type TipoDato,
} from "@/lib/exportar_datos";
import { hoyLima } from "@/lib/fechas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function entero(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

// 5.2 · Export PÚBLICO (sin login). SEGURIDAD: usa el cliente ANÓNIMO, así que
// solo puede leer lo que las políticas RLS `pub_*` permiten (las tablas de
// transparencia). perfiles, residentes, audit_log y constancias_pago no tienen
// política anon → aunque alguien manipule la URL, esas tablas devuelven vacío.
// Además, la lista de tipos exportables está acotada a TIPOS_DATO_PUBLICO.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;

  const datos: TipoDato[] = q
    .getAll("datos")
    .flatMap((v) => v.split(","))
    .map((x) => x.trim())
    .filter((x): x is TipoDato => (TIPOS_DATO_PUBLICO as string[]).includes(x));

  if (datos.length === 0) {
    return new Response("Elige al menos un tipo de dato para descargar.", {
      status: 400,
    });
  }

  const opciones: OpcionesExport = {
    datos,
    desdePeriodoId: entero(q.get("desde")),
    hastaPeriodoId: entero(q.get("hasta")),
  };

  let hojas: HojaExcel[] = await armarHojas(opciones, createPublicClient());
  if (hojas.length === 0) {
    hojas = [
      {
        nombre: "Sin datos",
        columnas: [{ encabezado: "Aviso", clave: "aviso", tipo: "texto" }],
        filas: [{ aviso: "No hay datos para los filtros elegidos." }],
      },
    ];
  }

  const buffer = await construirLibro(hojas);
  const archivo = nombreArchivo("cuentas", hoyLima());

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${archivo}"`,
      // Sin caché en ninguna capa (navegador y CDN de Netlify): el archivo
      // debe salir con los datos del momento.
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
      "Netlify-CDN-Cache-Control": "no-store",
    },
  });
}
