import { requireRol } from "@/lib/roles";
import { getOcurrencias } from "@/lib/ocurrencias";
import { etiquetaCategoria } from "@/lib/ocurrencias-cat";

// 6.3 · Vista imprimible del cuaderno (el navegador la guarda como PDF con las
// fotos incluidas). Es un route handler: devuelve un HTML completo SIN el marco
// de la app, así el PDF sale limpio. Solo personal (portería/tesorería/admin).
export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

export async function GET(request: Request): Promise<Response> {
  await requireRol(["porteria", "tesoreria", "admin"]);

  const url = new URL(request.url);
  const rango = /^\d{4}-\d{2}-\d{2}$/;
  const desde = rango.test(url.searchParams.get("desde") ?? "") ? url.searchParams.get("desde")! : undefined;
  const hasta = rango.test(url.searchParams.get("hasta") ?? "") ? url.searchParams.get("hasta")! : undefined;

  const ocurrencias = await getOcurrencias({ desde, hasta });
  const hoy = new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });

  const rangoTxt =
    desde || hasta
      ? `Del ${desde ? fechaCorta(desde) : "inicio"} al ${hasta ? fechaCorta(hasta) : "hoy"}`
      : "Todas las ocurrencias";

  const items = ocurrencias
    .map((o) => {
      const fotos = o.fotos
        .filter((f) => f.url)
        .map((f) => `<img src="${esc(f.url!)}" alt="Evidencia" />`)
        .join("");
      return `
      <article class="oc">
        <div class="oc-cab">
          <span class="cat">${esc(etiquetaCategoria(o.categoria))}</span>
          <span class="fecha">${esc(fechaCorta(o.fecha))}</span>
        </div>
        <h2>${esc(o.titulo)}</h2>
        ${o.detalle ? `<p class="detalle">${esc(o.detalle)}</p>` : ""}
        ${fotos ? `<div class="fotos">${fotos}</div>` : ""}
        ${o.creadoPor ? `<p class="pie">Registrado por ${esc(o.creadoPor)}</p>` : ""}
      </article>`;
    })
    .join("");

  const vacio = `<p class="vacio">No hay ocurrencias en este rango.</p>`;

  const html = `<!doctype html>
<html lang="es-PE">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Cuaderno de ocurrencias · Chardin 177</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; color: #475569; font-size: 13px; }
  .barra { position: sticky; top: 0; background: #f8fafc; padding: 10px 0 14px; }
  .barra button { font-size: 15px; font-weight: 700; background: #0f172a; color: #fff; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; }
  .oc { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 14px; page-break-inside: avoid; }
  .oc-cab { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .cat { background: #0f172a; color: #fff; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 999px; }
  .fecha { color: #64748b; font-weight: 600; font-size: 13px; }
  .oc h2 { margin: 4px 0; font-size: 17px; }
  .detalle { margin: 4px 0; color: #334155; white-space: pre-line; }
  .fotos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .fotos img { width: 30%; max-width: 220px; height: auto; border: 1px solid #cbd5e1; border-radius: 8px; object-fit: cover; }
  .pie { margin: 8px 0 0; color: #94a3b8; font-size: 11px; }
  .vacio { color: #64748b; padding: 24px; text-align: center; }
  @media print {
    body { padding: 0; }
    .barra { display: none; }
  }
</style>
</head>
<body>
  <div class="barra">
    <button type="button" onclick="window.print()">Imprimir / Guardar como PDF</button>
  </div>
  <header>
    <h1>Cuaderno de ocurrencias · Chardin 177</h1>
    <p>${esc(rangoTxt)} · Generado el ${esc(hoy)} · ${ocurrencias.length} registro${ocurrencias.length === 1 ? "" : "s"}</p>
  </header>
  ${items || vacio}
  <script>
    window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
