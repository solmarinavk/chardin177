import type { Metadata } from "next";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import { getProvisionesConSaldo, getMovimientosProvision } from "@/lib/caja";
import { formatoPEN } from "@/lib/centimos";
import { formatoFecha } from "@/lib/fechas";
import { IconoFlecha } from "@/components/iconos";
import {
  FormConfigurarProvision,
  FormMovimientoProvision,
} from "@/components/forms/provision";
import { configurarProvision, registrarMovimientoProvision } from "./acciones";

export const metadata: Metadata = { title: "Provisiones" };

export default async function ProvisionesPage() {
  const perfil = await requireRol(["tesoreria", "admin", "residente"]);
  const esAdmin = perfil.rol === "admin";
  const gestiona = perfil.rol === "tesoreria" || perfil.rol === "admin";

  const [provisiones, movimientos] = await Promise.all([
    getProvisionesConSaldo(),
    getMovimientosProvision(20),
  ]);

  const total = provisiones.reduce((a, p) => a + p.saldoCent, 0);
  const nombreProvision = new Map(provisiones.map((p) => [p.id, p.concepto]));

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer">
        <Link href="/caja" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          ← Caja
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Provisiones
        </h1>
        <p className="mt-1 text-slate-600">
          Fondos apartados para las obligaciones del vigilante (vacaciones, CTS,
          gratificación). Se acumulan solos al cerrar cada mes.
        </p>
      </div>

      <section className="card animar-aparecer p-5">
        <p className="titulo-seccion">Total provisionado</p>
        <p className="num mt-1 text-3xl font-black text-slate-900">
          {formatoPEN(total)}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        {provisiones.map((p) => (
          <div key={p.id} className="card animar-aparecer p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">{p.concepto}</h2>
              <span className="num text-lg font-black text-slate-900">
                {formatoPEN(p.saldoCent)}
              </span>
            </div>
            <p className="num mt-0.5 text-sm text-slate-500">
              Aporte mensual: {formatoPEN(p.aporte_mensual_cent)}
              {!p.activo && " · (inactiva)"}
            </p>

            {esAdmin && (
              <FormConfigurarProvision
                accion={configurarProvision}
                provisionId={p.id}
                aporteActualCent={p.aporte_mensual_cent}
                activo={p.activo}
              />
            )}
            {gestiona && (
              <FormMovimientoProvision
                accion={registrarMovimientoProvision}
                provisionId={p.id}
              />
            )}
          </div>
        ))}
      </section>

      {movimientos.length > 0 && (
        <section className="card animar-aparecer p-5">
          <h2 className="titulo-seccion mb-3">Últimos movimientos</h2>
          <ul className="flex flex-col gap-1.5">
            {movimientos.map((m) => (
              <li
                key={m.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium text-slate-800">
                    {nombreProvision.get(m.provision_id) ?? "—"}
                  </span>{" "}
                  <span className="text-slate-500">{m.concepto}</span>{" "}
                  <span className="num text-xs text-slate-400">
                    {formatoFecha(m.creado_en)}
                  </span>
                </span>
                <span
                  className={`num shrink-0 font-bold ${
                    m.monto_cent < 0 ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {m.monto_cent < 0 ? "−" : "+"}
                  {formatoPEN(Math.abs(m.monto_cent))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/caja"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        Volver a Caja
        <IconoFlecha className="h-4 w-4" />
      </Link>
    </main>
  );
}
