"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatoPEN } from "@/lib/centimos";
import { PISOS_EDIFICIO, type DptoEdificio } from "@/lib/edificio";
import { IconoFlecha } from "@/components/iconos";

// 5.1 · El edificio visual: la fachada del Chardin 177 con una ventana por
// departamento, iluminada según el estado de pago del mes. Tocar una ventana
// muestra el detalle; con `pagarBase` (vista tesorería/admin), tocar un dpto
// con deuda lleva DIRECTO a su formulario de cobro (pago en un toque, 5.4a).

const GLASS = {
  pagado: { de: "#34d399", a: "#059669", glow: "#34d399" },
  parcial: { de: "#fcd34d", a: "#d97706", glow: "#fbbf24" },
  pendiente: { de: "#f87171", a: "#b91c1c", glow: "#f87171" },
  neutro: { de: "#dbeafe", a: "#93c5fd", glow: "" },
} as const;

const ESTADO_TEXTO = {
  pagado: "Pagó",
  parcial: "Pago parcial",
  pendiente: "Pendiente",
} as const;

function claveGlass(estado: DptoEdificio["estado"]): keyof typeof GLASS {
  return estado ?? "neutro";
}

// Geometría (viewBox 260×410): parapeto arriba, 5 pisos, portal abajo.
const PISO_ALTO = 50;
const PISOS_Y0 = 58;
const VENTANA = { w: 64, h: 32, xIzq: 48, xDer: 148 };

export function Edificio({
  deptos,
  pagarBase,
}: {
  deptos: DptoEdificio[];
  pagarBase?: string; // ej. "/periodos/12" → tap en moroso navega a cobrar
}) {
  const router = useRouter();
  const [sel, setSel] = useState<number | null>(null);
  const por = new Map(deptos.map((d) => [d.dpto, d]));
  const conEstado = deptos.some((d) => d.estado !== null);

  const n = {
    pagados: deptos.filter((d) => d.estado === "pagado").length,
    parciales: deptos.filter((d) => d.estado === "parcial").length,
    pendientes: deptos.filter((d) => d.estado === "pendiente").length,
  };

  function urlPago(dpto: number): string {
    return `${pagarBase}?pagar=${dpto}#dpto-${dpto}`;
  }

  function tocar(d: DptoEdificio) {
    // Vista de cobranza: un moroso se toca y se va directo a cobrarle.
    if (pagarBase && (d.estado === "pendiente" || d.estado === "parcial")) {
      router.push(urlPago(d.dpto));
      return;
    }
    setSel((prev) => (prev === d.dpto ? null : d.dpto));
  }

  const detalle = sel !== null ? por.get(sel) : undefined;

  return (
    <div className="mx-auto w-full max-w-[300px]">
      {conEstado && (
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          <span className="chip num bg-emerald-100 text-emerald-800">
            {n.pagados} al día
          </span>
          <span className="chip num bg-amber-100 text-amber-800">
            {n.parciales} parcial{n.parciales === 1 ? "" : "es"}
          </span>
          <span className="chip num bg-red-100 text-red-800">
            {n.pendientes} pendiente{n.pendientes === 1 ? "" : "s"}
          </span>
        </div>
      )}

      <svg
        viewBox="0 0 260 410"
        role="img"
        aria-label="Fachada del edificio Chardin 177 con el estado de pago de cada departamento"
        className="w-full"
      >
        <defs>
          {(Object.keys(GLASS) as (keyof typeof GLASS)[]).map((k) => (
            <linearGradient key={k} id={`vidrio-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GLASS[k].de} />
              <stop offset="100%" stopColor={GLASS[k].a} />
            </linearGradient>
          ))}
          <linearGradient id="fachada" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#faf6ed" />
            <stop offset="100%" stopColor="#f1e9d8" />
          </linearGradient>
        </defs>

        {/* Azotea: tanque de agua y antena */}
        <g stroke="#94a3b8" strokeWidth="2" fill="#cbd5e1">
          <rect x="46" y="8" width="26" height="15" rx="3" />
          <line x1="51" y1="23" x2="51" y2="30" />
          <line x1="67" y1="23" x2="67" y2="30" />
        </g>
        <g stroke="#94a3b8" strokeWidth="2">
          <line x1="206" y1="30" x2="206" y2="6" />
          <circle cx="206" cy="5" r="2.5" fill="#94a3b8" stroke="none" />
        </g>

        {/* Cuerpo del edificio */}
        <rect x="24" y="22" width="212" height="8" rx="2" fill="#d8c9ac" />
        <rect x="28" y="30" width="204" height="332" fill="url(#fachada)" stroke="#d9cdb4" strokeWidth="1.5" />
        <rect x="222" y="30" width="10" height="332" fill="#e9dfc9" />

        {/* Letrero */}
        <rect x="66" y="36" width="128" height="18" rx="4" fill="#0f172a" />
        <text
          x="130"
          y="49"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          letterSpacing="2.5"
          fill="#f8fafc"
          style={{ fontFamily: "inherit" }}
        >
          CHARDIN 177
        </text>

        {/* Pisos con sus ventanas */}
        {PISOS_EDIFICIO.map(([izq, der], fila) => {
          const yPiso = PISOS_Y0 + fila * PISO_ALTO;
          return (
            <g key={fila}>
              <line
                x1="30"
                y1={yPiso + PISO_ALTO - 1}
                x2="230"
                y2={yPiso + PISO_ALTO - 1}
                stroke="#e7dcc4"
                strokeWidth="1.5"
              />
              {[izq, der].map((numDpto, col) => {
                const d = por.get(numDpto) ?? {
                  dpto: numDpto,
                  estado: null,
                  totalCent: null,
                  pagadoCent: 0,
                };
                const x = col === 0 ? VENTANA.xIzq : VENTANA.xDer;
                const y = yPiso + 7;
                const k = claveGlass(d.estado);
                const activa = sel === d.dpto;
                const texto =
                  d.estado === null
                    ? `Dpto ${d.dpto}: sin cuota este mes`
                    : `Dpto ${d.dpto}: ${ESTADO_TEXTO[d.estado]}, ${formatoPEN(d.pagadoCent)} de ${formatoPEN(d.totalCent ?? 0)}`;
                return (
                  <g
                    key={numDpto}
                    role="button"
                    tabIndex={0}
                    aria-label={texto}
                    onClick={() => tocar(d)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        tocar(d);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {/* halo de luz según estado */}
                    {d.estado !== null && (
                      <rect
                        x={x - 4}
                        y={y - 4}
                        width={VENTANA.w + 8}
                        height={VENTANA.h + 8}
                        rx="8"
                        fill={GLASS[k].glow}
                        opacity="0.3"
                      />
                    )}
                    {/* marco + vidrio */}
                    <rect
                      x={x - 2.5}
                      y={y - 2.5}
                      width={VENTANA.w + 5}
                      height={VENTANA.h + 5}
                      rx="5"
                      fill="#ffffff"
                      stroke={activa ? "#0f172a" : "#cbbfa6"}
                      strokeWidth={activa ? 3 : 1.5}
                    />
                    <rect
                      x={x}
                      y={y}
                      width={VENTANA.w}
                      height={VENTANA.h}
                      rx="3"
                      fill={`url(#vidrio-${k})`}
                    />
                    {/* división de la ventana */}
                    <line x1={x + VENTANA.w / 2} y1={y} x2={x + VENTANA.w / 2} y2={y + VENTANA.h} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.5" />
                    <line x1={x} y1={y + 12} x2={x + VENTANA.w} y2={y + 12} stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
                    {/* placa con el número */}
                    <rect x={x + VENTANA.w / 2 - 14} y={y + VENTANA.h - 13} width="28" height="11" rx="3" fill="#ffffff" opacity="0.92" />
                    <text
                      x={x + VENTANA.w / 2}
                      y={y + VENTANA.h - 4.5}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="800"
                      fill="#0f172a"
                      style={{ fontFamily: "inherit" }}
                    >
                      {d.dpto}
                    </text>
                    {/* barandal del balcón */}
                    <line x1={x - 2} y1={y + VENTANA.h + 8} x2={x + VENTANA.w + 2} y2={y + VENTANA.h + 8} stroke="#c9bda3" strokeWidth="2" />
                    {[0.2, 0.4, 0.6, 0.8].map((f) => (
                      <line
                        key={f}
                        x1={x + VENTANA.w * f}
                        y1={y + VENTANA.h + 3}
                        x2={x + VENTANA.w * f}
                        y2={y + VENTANA.h + 8}
                        stroke="#c9bda3"
                        strokeWidth="1.5"
                      />
                    ))}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Portal: puerta, escalones y maceteros */}
        <g>
          <rect x="108" y="312" width="44" height="50" rx="3" fill="#5f3818" />
          <path d="M112 362 v-40 a18 18 0 0 1 36 0 v40 z" fill="#8b5e34" />
          <line x1="130" y1="322" x2="130" y2="362" stroke="#5f3818" strokeWidth="2" />
          <circle cx="124" cy="344" r="1.8" fill="#fbbf24" />
          <circle cx="136" cy="344" r="1.8" fill="#fbbf24" />
          <rect x="100" y="362" width="60" height="4" fill="#cbc0aa" />
          <rect x="94" y="366" width="72" height="4" fill="#bdb29b" />
          {/* maceteros */}
          <ellipse cx="82" cy="344" rx="9" ry="11" fill="#3f6f43" />
          <rect x="75" y="352" width="14" height="10" rx="2" fill="#a16a3c" />
          <ellipse cx="178" cy="344" rx="9" ry="11" fill="#3f6f43" />
          <rect x="171" y="352" width="14" height="10" rx="2" fill="#a16a3c" />
        </g>

        {/* Vereda */}
        <rect x="12" y="370" width="236" height="5" rx="2" fill="#d6d3cb" />
      </svg>

      {/* Detalle del dpto tocado */}
      {detalle && detalle.estado !== null && (
        <div className="animar-aparecer mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-slate-900">Dpto {detalle.dpto}</p>
            <span
              className={`chip ${
                detalle.estado === "pagado"
                  ? "bg-emerald-100 text-emerald-800"
                  : detalle.estado === "parcial"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {ESTADO_TEXTO[detalle.estado]}
            </span>
          </div>
          <p className="num mt-1 text-sm text-slate-600">
            Pagado{" "}
            <span className="font-bold text-slate-900">
              {formatoPEN(detalle.pagadoCent)}
            </span>{" "}
            de {formatoPEN(detalle.totalCent ?? 0)}
            {detalle.estado !== "pagado" && (
              <>
                {" · "}debe{" "}
                <span className="font-bold text-red-700">
                  {formatoPEN((detalle.totalCent ?? 0) - detalle.pagadoCent)}
                </span>
              </>
            )}
          </p>
          {pagarBase && detalle.estado !== "pagado" && (
            <a href={urlPago(detalle.dpto)} className="btn-primary mt-3 w-full">
              Registrar su pago
              <IconoFlecha className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
      {detalle && detalle.estado === null && (
        <p className="mt-3 text-center text-sm text-slate-500">
          El dpto {detalle.dpto} aún no tiene cuota este mes.
        </p>
      )}
    </div>
  );
}
