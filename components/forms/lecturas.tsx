"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { CampoFoto } from "@/components/forms/CampoFoto";
import { Progreso } from "@/components/Progreso";
import { IconoCheck, IconoAlerta } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export type FilaLectura = {
  dpto: number;
  anterior: number;
  actual: number | null;
  promedio: number | null; // consumo promedio 6 meses (para alerta)
  fotoUrl: string | null; // URL firmada de la foto ya guardada (si hay)
};

export function FormLecturas({
  accion,
  periodoId,
  filas,
}: {
  accion: Accion;
  periodoId: number;
  filas: FilaLectura[];
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  const [valores, setValores] = useState<Record<number, { anterior: string; actual: string }>>(
    () =>
      Object.fromEntries(
        filas.map((f) => [
          f.dpto,
          { anterior: String(f.anterior), actual: f.actual === null ? "" : String(f.actual) },
        ]),
      ),
  );

  function set(dpto: number, campo: "anterior" | "actual", v: string) {
    setValores((prev) => ({ ...prev, [dpto]: { ...prev[dpto]!, [campo]: v } }));
  }

  function estadoFila(f: FilaLectura) {
    const v = valores[f.dpto]!;
    const ant = Number(v.anterior);
    const act = v.actual === "" ? null : Number(v.actual);
    const delta = act === null ? null : act - ant;
    const menor = delta !== null && delta < 0;
    const alta =
      delta !== null &&
      !menor &&
      f.promedio !== null &&
      f.promedio > 0 &&
      Math.abs(delta - f.promedio) / f.promedio > 0.6;
    const completa = delta !== null && !menor;
    return { delta, menor, alta, completa };
  }

  const completadas = filas.filter((f) => estadoFila(f).completa).length;
  const hayError = filas.some((f) => estadoFila(f).menor);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input type="hidden" name="dptos" value={filas.map((f) => f.dpto).join(",")} />

      <ul className="flex flex-col gap-3">
        {filas.map((f, i) => {
          const v = valores[f.dpto]!;
          const { delta, menor, alta, completa } = estadoFila(f);

          return (
            <li
              key={f.dpto}
              className={`card animar-aparecer p-4 transition ${
                menor
                  ? "border-red-300 ring-2 ring-red-100"
                  : completa
                    ? "border-emerald-300"
                    : ""
              }`}
              style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`num flex h-10 w-12 items-center justify-center rounded-xl text-sm font-black ${
                      completa
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-900 text-white"
                    }`}
                  >
                    {completa ? <IconoCheck className="h-5 w-5" /> : f.dpto}
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    Dpto {f.dpto}
                  </span>
                </div>
                {delta !== null && !menor && (
                  <span
                    className={`chip num ${
                      alta ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {delta} m³
                  </span>
                )}
              </div>

              <div className="mt-3 flex gap-3">
                <div className="w-1/2">
                  <label className="etiqueta" htmlFor={`anterior_${f.dpto}`}>
                    Anterior
                  </label>
                  <input
                    id={`anterior_${f.dpto}`}
                    name={`anterior_${f.dpto}`}
                    type="number"
                    inputMode="numeric"
                    enterKeyHint="next"
                    min={0}
                    value={v.anterior}
                    onChange={(e) => set(f.dpto, "anterior", e.target.value)}
                    className="campo num bg-slate-50"
                  />
                </div>
                <div className="w-1/2">
                  <label className="etiqueta" htmlFor={`actual_${f.dpto}`}>
                    Actual
                  </label>
                  <input
                    id={`actual_${f.dpto}`}
                    name={`actual_${f.dpto}`}
                    type="number"
                    inputMode="numeric"
                    enterKeyHint="next"
                    min={0}
                    value={v.actual}
                    onChange={(e) => set(f.dpto, "actual", e.target.value)}
                    className={`campo num ${menor ? "border-red-500 ring-2 ring-red-200" : ""}`}
                  />
                </div>
              </div>

              {menor && (
                <p
                  role="alert"
                  className="mt-2 flex items-start gap-1.5 text-sm font-medium text-red-700"
                >
                  <IconoAlerta className="mt-0.5 h-4 w-4 shrink-0" />
                  La lectura actual no puede ser menor que la anterior.
                </p>
              )}
              {alta && (
                <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-amber-700">
                  <IconoAlerta className="mt-0.5 h-4 w-4 shrink-0" />
                  Consumo muy distinto al promedio (≈{Math.round((f.promedio ?? 0) * 10) / 10}{" "}
                  m³). Vuelve a mirar el medidor.
                </p>
              )}

              <div className="mt-3">
                <CampoFoto
                  id={`foto_${f.dpto}`}
                  name={`foto_${f.dpto}`}
                  etiqueta="Foto del medidor (opcional)"
                  camara
                />
                {f.fotoUrl && (
                  <a
                    href={f.fotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-semibold text-slate-500 underline hover:text-slate-900"
                  >
                    Ver la foto ya guardada
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Barra de guardado que flota sobre la navegación del celular */}
      <div className="sticky bottom-24 z-30 sm:bottom-4">
        <div className="card flex items-center gap-3 p-3 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="num text-sm font-bold text-slate-900">
              {completadas}/10 listas
            </p>
            <Progreso valor={completadas} max={10} etiqueta="Avance de lecturas" />
          </div>
          <BotonEnviar className="btn-primary shrink-0 px-4" textoEnviando="Guardando…">
            Guardar
          </BotonEnviar>
        </div>
        {hayError && (
          <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            Corrige los departamentos marcados en rojo antes de guardar.
          </p>
        )}
        {estado.error && (
          <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {estado.error}
          </p>
        )}
        {estado.ok && estado.mensaje && (
          <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <IconoCheck className="h-4 w-4" />
            {estado.mensaje}
          </p>
        )}
      </div>
    </form>
  );
}
