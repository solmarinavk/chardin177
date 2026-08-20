import { createClient } from "@/lib/supabase/server";
import { BUCKET_OCURRENCIAS, urlFirmada } from "@/lib/storage";

// Categorías y helpers puros viven en un módulo sin dependencias de servidor;
// se re-exportan aquí para quien ya importa desde este archivo.
export {
  CATEGORIAS_OCURRENCIA,
  etiquetaCategoria,
  esCategoriaValida,
} from "@/lib/ocurrencias-cat";

export type FotoOcurrencia = { id: number; url: string | null };

export type Ocurrencia = {
  id: number;
  fecha: string;
  categoria: string;
  titulo: string;
  detalle: string | null;
  creadoPor: string | null; // nombre del perfil que la registró (o null)
  fotos: FotoOcurrencia[];
};

export type FiltroOcurrencias = { desde?: string; hasta?: string };

// Lista de ocurrencias (más recientes primero), con sus fotos ya firmadas y el
// nombre de quién la registró. Opcionalmente filtra por rango de fechas.
export async function getOcurrencias(
  filtro: FiltroOcurrencias = {},
): Promise<Ocurrencia[]> {
  const s = createClient();
  let q = s
    .from("ocurrencias")
    .select("*")
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });
  if (filtro.desde) q = q.gte("fecha", filtro.desde);
  if (filtro.hasta) q = q.lte("fecha", filtro.hasta);

  const { data: ocs, error } = await q;
  if (error || !ocs || ocs.length === 0) return [];

  const ocIds = ocs.map((o) => o.id);
  const { data: fotosData } = await s
    .from("ocurrencia_fotos")
    .select("*")
    .in("ocurrencia_id", ocIds);

  const fotosPorOc = new Map<number, { id: number; ruta: string }[]>();
  for (const f of fotosData ?? []) {
    const arr = fotosPorOc.get(f.ocurrencia_id) ?? [];
    arr.push({ id: f.id, ruta: f.ruta });
    fotosPorOc.set(f.ocurrencia_id, arr);
  }

  const creadorIds = [
    ...new Set(ocs.map((o) => o.creado_por).filter(Boolean)),
  ] as string[];
  const nombres = new Map<string, string>();
  if (creadorIds.length > 0) {
    const { data: perfiles } = await s
      .from("perfiles")
      .select("user_id, nombre")
      .in("user_id", creadorIds);
    for (const p of perfiles ?? []) nombres.set(p.user_id, p.nombre);
  }

  return Promise.all(
    ocs.map(async (o) => ({
      id: o.id,
      fecha: o.fecha,
      categoria: o.categoria,
      titulo: o.titulo,
      detalle: o.detalle,
      creadoPor: o.creado_por ? (nombres.get(o.creado_por) ?? null) : null,
      fotos: await Promise.all(
        (fotosPorOc.get(o.id) ?? []).map(async (f) => ({
          id: f.id,
          url: await urlFirmada(BUCKET_OCURRENCIAS, f.ruta),
        })),
      ),
    })),
  );
}
