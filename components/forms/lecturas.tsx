"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export type FilaLectura = {
  dpto: number;
  anterior: number;
  actual: number | null;
  promedio: number | null; // consumo promedio 6 meses (para alerta)
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

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input type="hidden" name="dptos" value={filas.map((f) => f.dpto).join(",")} />

      <ul className="flex flex-col gap-3">
        {filas.map((f) => {
          const v = valores[f.dpto]!;
          const ant = Number(v.anterior);
          const act = v.actual === "" ? null : Number(v.actual);
          const delta = act === null ? null : act - ant;
          const menor = delta !== null && delta < 0;
          const variacionAlta =
            delta !== null &&
            !menor &&
            f.promedio !== null &&
            f.promedio > 0 &&
            Math.abs(delta - f.promedio) / f.promedio > 0.6;

          return (
            <li
              key={f.dpto}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900">Dpto {f.dpto}</span>
                <span className="text-sm text-slate-500">
                  {delta === null ? "—" : `${delta} m³`}
                </span>
              </div>
              <div className="mt-2 flex gap-3">
                <div className="w-1/2">
                  <label className="etiqueta" htmlFor={`anterior_${f.dpto}`}>
                    Anterior
                  </label>
                  <input
                    id={`anterior_${f.dpto}`}
                    name={`anterior_${f.dpto}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={v.anterior}
                    onChange={(e) => set(f.dpto, "anterior", e.target.value)}
                    className="campo"
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
                    min={0}
                    required
                    value={v.actual}
                    onChange={(e) => set(f.dpto, "actual", e.target.value)}
                    className={`campo ${menor ? "border-red-500 ring-2 ring-red-200" : ""}`}
                  />
                </div>
              </div>

              {menor && (
                <p className="mt-2 text-sm font-medium text-red-700">
                  La lectura actual no puede ser menor que la anterior.
                </p>
              )}
              {variacionAlta && (
                <p className="mt-2 text-sm font-medium text-amber-700">
                  ⚠️ Variación alta vs. el promedio ({f.promedio} m³). Revisa la lectura.
                </p>
              )}

              <div className="mt-2">
                <label className="etiqueta" htmlFor={`foto_${f.dpto}`}>
                  Foto del medidor (opcional)
                </label>
                <input
                  id={`foto_${f.dpto}`}
                  name={`foto_${f.dpto}`}
                  type="file"
                  accept="image/*"
                  className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2"
                />
              </div>
            </li>
          );
        })}
      </ul>

      {estado.error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && estado.mensaje && (
        <p className="text-sm font-medium text-green-700">{estado.mensaje}</p>
      )}
      <BotonEnviar>Guardar lecturas</BotonEnviar>
    </form>
  );
}
