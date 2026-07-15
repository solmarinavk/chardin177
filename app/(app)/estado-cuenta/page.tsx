import Link from "next/link";
import { getPerfil } from "@/lib/roles";
import { getEstadosDeCuenta } from "@/lib/periodos";
import { formatoPEN } from "@/lib/centimos";

export default async function EstadoCuentaPage() {
  const perfil = await getPerfil();
  if (!perfil) return null;

  const todos = await getEstadosDeCuenta();
  // Si el perfil está asociado a un dpto, muestra solo el suyo; si no
  // (cuenta compartida de vecinos), muestra todos (transparencia).
  const filas =
    perfil.dpto_id != null ? todos.filter((f) => f.dpto === perfil.dpto_id) : todos;

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Estado de cuenta</h1>
        <p className="mt-1 text-slate-600">
          Cargos (cuotas emitidas) vs. abonos (pagos) por departamento.
        </p>
      </div>

      {filas.length === 0 ? (
        <p className="text-slate-500">
          Aún no hay cuotas emitidas. Revisa los{" "}
          <Link href="/periodos" className="font-semibold text-blue-700 underline">
            periodos
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[420px] text-right text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Dpto</th>
                <th className="px-3 py-2">Cargos</th>
                <th className="px-3 py-2">Abonos</th>
                <th className="px-3 py-2">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.dpto} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-left font-semibold">{f.dpto}</td>
                  <td className="px-3 py-2">{formatoPEN(f.cargos)}</td>
                  <td className="px-3 py-2">{formatoPEN(f.abonos)}</td>
                  <td
                    className={`px-3 py-2 font-bold ${
                      f.saldo > 0 ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    {formatoPEN(f.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Saldo positivo = pendiente por pagar. Saldo negativo o cero = al día.
      </p>
    </main>
  );
}
