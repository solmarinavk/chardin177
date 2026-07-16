"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { IconoCheck } from "@/components/iconos";
import { formatoPEN } from "@/lib/centimos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

function BotonQuitar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg px-2 py-1 text-xs font-bold text-red-700 underline decoration-red-300 underline-offset-2 transition hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Quitando…" : "Quitar"}
    </button>
  );
}

// Elimina una derrama por concepto.
export function FormEliminarDerrama({
  accion,
  periodoId,
  concepto,
}: {
  accion: Accion;
  periodoId: number;
  concepto: string;
}) {
  const [, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm(`¿Quitar la derrama "${concepto}"?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input type="hidden" name="concepto" value={concepto} />
      <BotonQuitar />
    </form>
  );
}

export function FormDerrama({
  accion,
  periodoId,
  dptos,
}: {
  accion: Accion;
  periodoId: number;
  dptos: number[];
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  const [modo, setModo] = useState<"igual" | "personalizado">("igual");
  const [montoIgual, setMontoIgual] = useState("");

  const totalIgual = Number(montoIgual) > 0 ? Number(montoIgual) * dptos.length : 0;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input type="hidden" name="dptos" value={dptos.join(",")} />
      <input type="hidden" name="modo" value={modo} />

      <div>
        <label className="etiqueta" htmlFor="concepto_derrama">
          Concepto
        </label>
        <input
          id="concepto_derrama"
          name="concepto"
          type="text"
          required
          maxLength={120}
          className="campo"
          placeholder="Ej. Pintado de fachada"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setModo("igual")}
          className={`chip flex-1 justify-center py-2 ${
            modo === "igual" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Igual para todos
        </button>
        <button
          type="button"
          onClick={() => setModo("personalizado")}
          className={`chip flex-1 justify-center py-2 ${
            modo === "personalizado"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Personalizado
        </button>
      </div>

      {modo === "igual" ? (
        <div>
          <label className="etiqueta" htmlFor="monto_derrama">
            Monto por departamento (S/)
          </label>
          <input
            id="monto_derrama"
            name="monto"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            required
            value={montoIgual}
            onChange={(e) => setMontoIgual(e.target.value)}
            className="campo num"
            placeholder="Ej. 200.00"
          />
          {totalIgual > 0 && (
            <p className="num mt-1 text-sm text-slate-500">
              Total de la derrama: {formatoPEN(Math.round(totalIgual * 100))} ({dptos.length}{" "}
              dptos)
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {dptos.map((d) => (
            <div key={d}>
              <label className="etiqueta" htmlFor={`monto_${d}`}>
                Dpto {d} (S/)
              </label>
              <input
                id={`monto_${d}`}
                name={`monto_${d}`}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue="0"
                className="campo num"
              />
            </div>
          ))}
        </div>
      )}

      <BotonEnviar textoEnviando="Creando…">Crear derrama</BotonEnviar>

      {estado.error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && estado.mensaje && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
          <IconoCheck className="h-4 w-4" />
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
