import { recordarPendientes } from "@/lib/notificaciones";

// 3.5 · Recordatorio del día 25 a los departamentos pendientes.
// Protegido con CRON_SECRET: un cron externo (Netlify Scheduled Function,
// GitHub Action o cron-job.org) hace POST con la cabecera
//   Authorization: Bearer <CRON_SECRET>
// el día 25 de cada mes. Ver docs/FASE_3.md.
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  try {
    const { enviados } = await recordarPendientes();
    return Response.json({ ok: true, enviados });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
