import type { Metadata } from "next";
import Link from "next/link";
import { getPerfil, ETIQUETA_ROL } from "@/lib/roles";
import { IconoFlecha } from "@/components/iconos";

export const metadata: Metadata = { title: "Ayuda" };

const PASOS = [
  { n: 1, titulo: "Lecturas de agua", quien: "Portería", texto: "Anota la lectura actual de los 10 medidores. La anterior se jala sola del mes pasado." },
  { n: 2, titulo: "Recibos del mes", quien: "Tesorería", texto: "Registra el monto del recibo de agua (Sedapal) y de luz, con su foto." },
  { n: 3, titulo: "Calcular cuotas", quien: "Tesorería", texto: "El sistema reparte todo y calcula la cuota de cada dpto. Nadie digita cuotas." },
  { n: 4, titulo: "Emitir", quien: "Tesorería / Admin", texto: "Congela las cuotas del mes. Desde aquí ya no se editan lecturas ni recibos." },
  { n: 5, titulo: "Cobrar", quien: "Tesorería", texto: "Registra los pagos de cada dpto. El semáforo se pone verde solo." },
  { n: 6, titulo: "Cerrar el mes", quien: "Tesorería / Admin", texto: "Cuadra la caja, fija el saldo y abre el mes siguiente con el saldo arrastrado." },
];

type Seccion = { titulo: string; puntos: string[] };

const SECCIONES: Seccion[] = [
  {
    titulo: "Las cuentas del edificio (página pública)",
    puntos: [
      "La página /transparencia es abierta (sin clave): muéstrala o comparte el enlace por WhatsApp.",
      "Ahí todos ven la caja, los gastos con comprobante, el consumo de agua y los pagos del mes.",
      "Es solo de consulta: nadie puede cambiar nada sin entrar con su usuario.",
    ],
  },
  {
    titulo: "Registrar un pago",
    puntos: [
      "Entra al mes emitido → Cobranza → busca el dpto → Registrar pago.",
      "Pon el monto (puede ser parcial), la fecha y el medio (Yape, transferencia…).",
      "Si el vecino te mandó su comprobante por WhatsApp, adjúntalo.",
    ],
  },
  {
    titulo: "Registrar un gasto (egreso)",
    puntos: [
      "Caja y egresos → completa concepto, categoría, monto y fecha; sube el comprobante.",
      "Marca si ya está pagado. Los gastos pagados salen de la caja del mes.",
      "Un mantenimiento o arreglo se registra igual, como un egreso con su categoría.",
    ],
  },
  {
    titulo: "Cuota extraordinaria (derrama)",
    puntos: [
      "En el mes en borrador → Cuota extraordinaria → concepto y monto por dpto.",
      "Pulsa Recalcular cuotas: aparece como EXTRA en el recibo de cada uno.",
    ],
  },
  {
    titulo: "Cuadre de agua (conciliación)",
    puntos: [
      "Caja → Conciliación de agua → elige el rango y pon el total real de Sedapal.",
      "Mira la vista previa por dpto y aplica: agrega ajustes al mes en borrador.",
    ],
  },
  {
    titulo: "Descargar a Excel",
    puntos: [
      "Cada módulo tiene un botón Descargar Excel de lo que estás viendo.",
      "En Exportar puedes bajar todo con filtros (rango de meses, dpto, categoría).",
      "Los montos salen en soles; puedes sumarlos en Excel.",
    ],
  },
  {
    titulo: "Solo administración",
    puntos: [
      "Cuotas fijas: cambia vigilancia, mantenimiento, materiales y agua común (crea una versión nueva).",
      "Usuarios y roles: traspaso de cargo (cambiar quién es tesorería, etc.) y padrón de residentes.",
      "Bitácora: quién cambió qué y cuándo. Documentos: reglamento, actas y el Excel histórico.",
    ],
  },
];

export default async function AyudaPage() {
  const perfil = await getPerfil();

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Ayuda
        </h1>
        <p className="mt-1 text-slate-600">
          El edificio, mes a mes, explicado simple.
          {perfil && (
            <>
              {" "}
              Tú entras como <span className="font-semibold">{ETIQUETA_ROL[perfil.rol]}</span>.
            </>
          )}
        </p>
      </div>

      {/* El mes en 6 pasos */}
      <section className="card animar-aparecer p-5">
        <h2 className="titulo-seccion mb-3">El mes en 6 pasos</h2>
        <ol className="flex flex-col gap-3">
          {PASOS.map((p) => (
            <li key={p.n} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                {p.n}
              </span>
              <div>
                <p className="font-bold text-slate-900">
                  {p.titulo}{" "}
                  <span className="text-xs font-medium text-slate-400">
                    · {p.quien}
                  </span>
                </p>
                <p className="text-sm text-slate-600">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Temas */}
      <section className="animar-aparecer flex flex-col gap-2">
        {SECCIONES.map((s) => (
          <details key={s.titulo} className="card group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-bold text-slate-900">
              {s.titulo}
              <IconoFlecha className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
            </summary>
            <ul className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {s.puntos.map((punto, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  {punto}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      <section className="card animar-aparecer p-5 text-sm text-slate-600">
        <h2 className="titulo-seccion mb-2">Reglas que nunca cambian</h2>
        <p>
          El sistema calcula las cuotas (nadie las digita), un mes emitido no se
          edita (las correcciones van como ajuste del mes siguiente), y cada
          cambio importante queda en la bitácora. El dinero siempre en soles, al
          céntimo.
        </p>
        <Link
          href="/transparencia"
          className="mt-3 inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          Ver las cuentas del edificio
          <IconoFlecha className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
