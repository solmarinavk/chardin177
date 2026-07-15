import type { Metadata } from "next";
import Link from "next/link";
import { getPerfil, ETIQUETA_ROL, menuPara, rolEsRedundante } from "@/lib/roles";
import { getPeriodoActual, getResumenPeriodo } from "@/lib/periodos";
import {
  getPeriodoAbierto,
  getLibroCaja,
  getEgresos,
  getConsumo6Meses,
  getSaldosProvisiones,
} from "@/lib/caja";
import { pasosDelMes, pasoActual } from "@/lib/flujo";
import { etiquetaPeriodo, formatoFecha, hoyLima } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { BUCKET_COMPROBANTES, urlFirmada } from "@/lib/storage";
import { Progreso } from "@/components/Progreso";
import { SemaforoMini } from "@/components/Semaforo";
import { ConsumoAgua } from "@/components/ConsumoAgua";
import { EstadoPeriodoBadge, EstadoCuotaBadge } from "@/components/estados";
import { ICONOS, IconoFlecha, IconoGota } from "@/components/iconos";

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage() {
  const perfil = await getPerfil();
  if (!perfil) return null;

  const periodo = await getPeriodoActual();
  const resumen = periodo ? await getResumenPeriodo(periodo) : null;
  const pasos = resumen
    ? pasosDelMes(resumen.periodo, {
        lecturas: resumen.lecturas,
        reciboAgua: resumen.reciboAgua,
        reciboLuz: resumen.reciboLuz,
        cuotas: resumen.cuotas.length,
        cuotasPagadas: resumen.cuotasPagadas,
      })
    : null;
  const siguiente = pasos ? pasoActual(pasos) : null;

  const gestiona = perfil.rol === "tesoreria" || perfil.rol === "admin";

  return (
    <main className="flex flex-col gap-5">
      <header className="animar-aparecer">
        <p className="text-sm text-slate-500">{formatoFecha(hoyLima())}</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Hola, {perfil.nombre} 👋
        </h1>
        {!rolEsRedundante(perfil) && (
          <p className="text-sm text-slate-500">{ETIQUETA_ROL[perfil.rol]}</p>
        )}
      </header>

      {/* ——— Sin ningún periodo aún ——— */}
      {!periodo && (
        <section className="card animar-aparecer p-6 text-center">
          <p className="text-4xl" aria-hidden>
            🗓️
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Todavía no hay ningún mes creado
          </h2>
          {gestiona ? (
            <>
              <p className="mt-1 text-slate-600">
                El primer paso es crear el periodo del mes. Toma unos segundos.
              </p>
              <Link href="/periodos" className="btn-primary mt-4">
                Crear el primer periodo
                <IconoFlecha className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <p className="mt-1 text-slate-600">
              Cuando tesorería abra el mes, aquí verás toda la información.
            </p>
          )}
        </section>
      )}

      {/* ——— Portería: su única misión, gigante y clara ——— */}
      {resumen && perfil.rol === "porteria" && (
        <section className="card animar-aparecer p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <IconoGota className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Lecturas de {etiquetaPeriodo(resumen.periodo.anio, resumen.periodo.mes)}
              </h2>
              <p className="text-sm text-slate-500">
                {resumen.periodo.estado !== "borrador"
                  ? "Este mes ya está emitido. No hay lecturas pendientes."
                  : resumen.lecturas === 10
                    ? "¡Las 10 lecturas están completas! 🎉"
                    : `Llevas ${resumen.lecturas} de 10 medidores.`}
              </p>
            </div>
          </div>
          {resumen.periodo.estado === "borrador" && (
            <>
              <div className="mt-4">
                <Progreso valor={resumen.lecturas} max={10} etiqueta="Avance de lecturas" />
              </div>
              <Link href="/lecturas" className="btn-primary mt-4 w-full">
                {resumen.lecturas === 10 ? "Revisar lecturas" : "Ingresar lecturas"}
                <IconoFlecha className="h-4 w-4" />
              </Link>
            </>
          )}
        </section>
      )}

      {/* ——— Tesorería / Admin: el GPS del mes ——— */}
      {resumen && gestiona && (
        <section className="card animar-aparecer p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {etiquetaPeriodo(resumen.periodo.anio, resumen.periodo.mes)}
            </h2>
            <EstadoPeriodoBadge estado={resumen.periodo.estado} />
          </div>

          {siguiente ? (
            <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Te toca ahora
              </p>
              <h3 className="mt-1 text-xl font-bold">{siguiente.titulo}</h3>
              <p className="mt-1 text-sm text-slate-300">{siguiente.descripcion}</p>
              {siguiente.href && (
                <Link
                  href={siguiente.href}
                  className="btn mt-4 w-full bg-white text-slate-900 hover:bg-slate-100"
                >
                  {siguiente.cta}
                  <IconoFlecha className="h-4 w-4" />
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-emerald-600 p-5 text-white">
              <h3 className="text-xl font-bold">¡Mes al día! 🎉</h3>
              <p className="mt-1 text-sm text-emerald-100">
                {resumen.periodo.estado === "cerrado"
                  ? "Este periodo está cerrado y su saldo ya pasó al siguiente."
                  : "Todos los departamentos pagaron."}
              </p>
              {resumen.periodo.estado === "cerrado" && (
                <Link
                  href="/periodos"
                  className="btn mt-4 w-full bg-white text-emerald-700 hover:bg-emerald-50"
                >
                  Crear el periodo siguiente
                  <IconoFlecha className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}

          {resumen.periodo.estado === "emitido" && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-slate-600">Recaudado</span>
                <span className="num font-bold text-slate-900">
                  {formatoPEN(resumen.recaudadoCent)}
                  <span className="font-normal text-slate-400">
                    {" "}
                    de {formatoPEN(resumen.esperadoCent)}
                  </span>
                </span>
              </div>
              <div className="mt-2">
                <Progreso
                  valor={resumen.recaudadoCent}
                  max={resumen.esperadoCent}
                  etiqueta="Recaudación del mes"
                />
              </div>
              <div className="mt-3">
                <SemaforoMini cuotas={resumen.cuotas} />
              </div>
            </div>
          )}

          <Link
            href={`/periodos/${resumen.periodo.id}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Ver el periodo completo
            <IconoFlecha className="h-4 w-4" />
          </Link>
        </section>
      )}

      {/* ——— Residentes: transparencia primero ——— */}
      {resumen && perfil.rol === "residente" && (
        <ResidenteInicio
          resumen={resumen}
          dptoId={perfil.dpto_id}
        />
      )}

      {/* ——— Dashboard de transparencia (2.4): caja, gastos, agua, provisiones ——— */}
      {periodo && perfil.rol !== "porteria" && <Transparencia />}

      {/* ——— Accesos rápidos ——— */}
      <section
        className="animar-aparecer grid grid-cols-2 gap-3"
        style={{ animationDelay: "80ms" }}
      >
        {menuPara(perfil.rol)
          .filter((m) => m.activo && m.href !== "/inicio")
          .map((m) => {
            const Icono = ICONOS[m.icono] ?? ICONOS.casa!;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icono className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {m.etiqueta}
                </span>
              </Link>
            );
          })}
      </section>
    </main>
  );
}

// Dashboard de transparencia (2.4): saldo de caja en vivo, últimos gastos con
// comprobante, consumo de agua de 6 meses y provisiones.
async function Transparencia() {
  const abierto = await getPeriodoAbierto();
  const [libro, consumos, provisiones] = await Promise.all([
    abierto ? getLibroCaja(abierto) : Promise.resolve(null),
    getConsumo6Meses(),
    getSaldosProvisiones(),
  ]);
  const ultimosEgresos = (await getEgresos({})).slice(0, 5);

  const urls = new Map<number, string>();
  for (const e of ultimosEgresos) {
    if (e.comprobante_url) {
      const url = await urlFirmada(BUCKET_COMPROBANTES, e.comprobante_url);
      if (url) urls.set(e.id, url);
    }
  }

  const totalProvisiones = provisiones.reduce((a, p) => a + p.saldoCent, 0);

  return (
    <>
      {libro && (
        <section
          className="card animar-aparecer p-5"
          style={{ animationDelay: "40ms" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="titulo-seccion">Caja del edificio</h2>
              <p className="num mt-1 text-3xl font-black text-slate-900">
                {formatoPEN(libro.saldoActualCent)}
              </p>
              <p className="text-xs text-slate-500">
                {etiquetaPeriodo(libro.periodo.anio, libro.periodo.mes)} · saldo en
                vivo
              </p>
            </div>
            <Link
              href="/caja"
              className="btn-secondary min-h-[40px] shrink-0 px-3 py-2 text-sm"
            >
              Ver caja
              <IconoFlecha className="h-4 w-4" />
            </Link>
          </div>
          {totalProvisiones !== 0 && (
            <p className="num mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Provisiones apartadas (vigilante):{" "}
              <span className="font-bold text-slate-900">
                {formatoPEN(totalProvisiones)}
              </span>{" "}
              · disponible real:{" "}
              <span className="font-bold text-slate-900">
                {formatoPEN(libro.saldoActualCent - totalProvisiones)}
              </span>
            </p>
          )}
        </section>
      )}

      {ultimosEgresos.length > 0 && (
        <section
          className="card animar-aparecer p-5"
          style={{ animationDelay: "60ms" }}
        >
          <h2 className="titulo-seccion mb-3">Últimos gastos</h2>
          <ul className="flex flex-col gap-2">
            {ultimosEgresos.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium text-slate-800">{e.concepto}</span>{" "}
                  <span className="num text-xs text-slate-400">
                    {formatoFecha(e.fecha)}
                  </span>
                  {urls.has(e.id) && (
                    <>
                      {" "}
                      <a
                        href={urls.get(e.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-900"
                      >
                        comprobante
                      </a>
                    </>
                  )}
                </span>
                <span className="num shrink-0 font-bold text-slate-900">
                  {formatoPEN(e.monto_cent)}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/caja"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Ver todos los egresos
            <IconoFlecha className="h-4 w-4" />
          </Link>
        </section>
      )}

      {consumos.length > 0 && (
        <section
          className="card animar-aparecer p-5"
          style={{ animationDelay: "80ms" }}
        >
          <h2 className="titulo-seccion mb-3">Consumo de agua por departamento</h2>
          <ConsumoAgua consumos={consumos} />
        </section>
      )}
    </>
  );
}

// Vista de inicio para residentes: su cuota (si su cuenta tiene dpto) o el
// estado general del edificio (cuenta compartida de vecinos).
function ResidenteInicio({
  resumen,
  dptoId,
}: {
  resumen: NonNullable<Awaited<ReturnType<typeof getResumenPeriodo>>>;
  dptoId: number | null;
}) {
  const { periodo, cuotas, pagadoPorCuota } = resumen;
  const enPreparacion = periodo.estado === "borrador";
  const miCuota = dptoId != null ? cuotas.find((c) => c.dpto_id === dptoId) : undefined;

  return (
    <section className="card animar-aparecer p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">
          {etiquetaPeriodo(periodo.anio, periodo.mes)}
        </h2>
        <EstadoPeriodoBadge estado={periodo.estado} />
      </div>

      {enPreparacion ? (
        <p className="mt-3 text-slate-600">
          El mes está en preparación. Cuando tesorería lo emita, aquí verás tu
          cuota y quién ya pagó.
        </p>
      ) : (
        <>
          {miCuota && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                  Tu cuota (Dpto {miCuota.dpto_id})
                </p>
                <EstadoCuotaBadge estado={miCuota.estado} />
              </div>
              <p className="num mt-1 text-3xl font-black text-slate-900">
                {formatoPEN(miCuota.total_cent)}
              </p>
              {miCuota.estado !== "pagado" && (
                <p className="mt-1 text-sm text-slate-500">
                  Pagado hasta ahora:{" "}
                  <span className="num font-semibold">
                    {formatoPEN(pagadoPorCuota.get(miCuota.id) ?? 0)}
                  </span>
                </p>
              )}
            </div>
          )}

          <div className="mt-4">
            <p className="titulo-seccion mb-2">Quién pagó este mes</p>
            <SemaforoMini cuotas={cuotas} />
          </div>

          <div className="mt-4 flex items-baseline justify-between text-sm">
            <span className="text-slate-600">Recaudado del edificio</span>
            <span className="num font-bold text-slate-900">
              {formatoPEN(resumen.recaudadoCent)}
              <span className="font-normal text-slate-400">
                {" "}
                de {formatoPEN(resumen.esperadoCent)}
              </span>
            </span>
          </div>
          <div className="mt-2">
            <Progreso
              valor={resumen.recaudadoCent}
              max={resumen.esperadoCent}
              etiqueta="Recaudación del mes"
            />
          </div>

          <Link
            href={`/periodos/${periodo.id}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Ver el detalle del mes
            <IconoFlecha className="h-4 w-4" />
          </Link>
        </>
      )}
    </section>
  );
}
