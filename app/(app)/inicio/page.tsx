import type { Metadata } from "next";
import Link from "next/link";
import { getPerfil, ETIQUETA_ROL, menuPara, rolEsRedundante } from "@/lib/roles";
import { getPeriodoActual, getResumenPeriodo } from "@/lib/periodos";
import { pasosDelMes, pasoActual } from "@/lib/flujo";
import { etiquetaPeriodo, formatoFecha, hoyLima } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { Progreso } from "@/components/Progreso";
import { Edificio } from "@/components/Edificio";
import { mapaEdificio } from "@/lib/edificio";
import { EstadoPeriodoBadge } from "@/components/estados";
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
              <div className="mt-4">
                <Edificio
                  deptos={mapaEdificio(resumen.cuotas, resumen.pagadoPorCuota)}
                  pagarBase={`/periodos/${resumen.periodo.id}`}
                />
                <p className="mt-2 text-center text-xs text-slate-500">
                  Toca un dpto en ámbar o rojo para registrarle el pago.
                </p>
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

      {/* ——— Transparencia pública: el enlace para compartir por WhatsApp ——— */}
      <section
        className="card animar-aparecer p-5"
        style={{ animationDelay: "40ms" }}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl">
            🔎
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              Transparencia del edificio
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              La caja, los gastos, el consumo de agua y quién pagó están en una
              página <span className="font-semibold">pública</span>. Comparte el
              enlace con los vecinos por WhatsApp.
            </p>
          </div>
        </div>
        <Link href="/transparencia" className="btn-secondary mt-4 w-full">
          Ver la página pública
          <IconoFlecha className="h-4 w-4" />
        </Link>
      </section>

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
