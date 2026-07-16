// Envío de correo con Resend (REST API). Si no hay RESEND_API_KEY configurada,
// no falla: simplemente no envía (skipped). Así la app funciona sin correo.

export type ResultadoEmail = { ok: boolean; skipped?: boolean; error?: string };

export async function enviarEmail(
  to: string,
  subject: string,
  html: string,
): Promise<ResultadoEmail> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Chardin 177 <onboarding@resend.dev>";
  if (!apiKey) return { ok: false, skipped: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) return { ok: false, error: `Resend respondió ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "error de red" };
  }
}
