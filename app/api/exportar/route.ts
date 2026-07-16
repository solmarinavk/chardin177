import { NextRequest } from "next/server";
import { getPerfil } from "@/lib/roles";
import { construirLibro, nombreArchivo, type HojaExcel } from "@/lib/exportar";
import { armarHojas, type OpcionesExport, type TipoDato } from "@/lib/exportar_datos";
import { hoyLima } from "@/lib/fechas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATOS_VALIDOS: TipoDato[] = ["cuotas", "pagos", "egresos", "estado", "caja"];

// Presets de los botones "Descargar Excel" de cada módulo.
const MODULOS: Record<string, TipoDato[]> = {
  caja: ["caja", "egresos"],
  egresos: ["egresos"],
  "estado-cuenta": ["estado"],
  periodo: ["cuotas", "pagos"],
};

function entero(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

export async function GET(req: NextRequest) {
  // Solo tesorería y admin exportan (la exportación respeta RLS: usa el cliente
  // de sesión, nunca la service role).
  const perfil = await getPerfil();
  if (!perfil || (perfil.rol !== "tesoreria" && perfil.rol !== "admin")) {
    return new Response("No autorizado.", { status: 403 });
  }

  const q = req.nextUrl.searchParams;
  const modulo = q.get("modulo");

  // `modulo` es un preset; si no, se toman los checkboxes `datos` (repetidos)
  // o un valor separado por comas.
  const datos: TipoDato[] = modulo
    ? MODULOS[modulo] ?? []
    : q
        .getAll("datos")
        .flatMap((v) => v.split(","))
        .map((x) => x.trim())
        .filter((x): x is TipoDato => (DATOS_VALIDOS as string[]).includes(x));

  if (datos.length === 0) {
    return new Response("Elige al menos un tipo de dato para exportar.", { status: 400 });
  }

  const opciones: OpcionesExport = {
    datos,
    periodoId: entero(q.get("periodo")),
    desdePeriodoId: entero(q.get("desde")),
    hastaPeriodoId: entero(q.get("hasta")),
    dpto: entero(q.get("dpto")),
    categoriaId: entero(q.get("categoria")),
  };

  let hojas: HojaExcel[] = await armarHojas(opciones);
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
  const base = modulo ?? datos.join("-");
  const archivo = nombreArchivo(base, hoyLima());

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${archivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
