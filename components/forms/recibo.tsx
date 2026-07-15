"use client";

import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { CampoFoto } from "@/components/forms/CampoFoto";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";
import type { TipoRecibo } from "@/lib/database.types";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function FormRecibo({
  accion,
  periodoId,
  tipo,
  montoActualCent,
}: {
  accion: Accion;
  periodoId: number;
  tipo: TipoRecibo;
  montoActualCent: number | null;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  const etiqueta = tipo === "agua" ? "Agua (Sedapal)" : "Luz común";
  const guardado = montoActualCent !== null;

  return (
    <form
      action={formAction}
      className={`rounded-2xl border p-4 transition ${
        guardado ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"
      }`}
    >
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input type="hidden" name="tipo" value={tipo} />

      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-slate-900">
          {tipo === "agua" ? "💧" : "💡"} {etiqueta}
        </p>
        {guardado && (
          <span className="chip bg-emerald-100 text-emerald-800">
            <IconoCheck className="h-3.5 w-3.5" />
            Guardado
          </span>
        )}
      </div>

      <div className="mt-3">
        <label htmlFor={`monto_${tipo}`} className="etiqueta">
          Monto del recibo (S/)
        </label>
        <input
          id={`monto_${tipo}`}
          name="monto"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          required
          defaultValue={guardado ? (montoActualCent / 100).toFixed(2) : ""}
          className="campo num"
          placeholder="Ej. 488.70"
        />
      </div>

      <div className="mt-3">
        <CampoFoto
          id={`foto_${tipo}`}
          name="foto"
          etiqueta="Foto del recibo (opcional)"
        />
      </div>

      <BotonEnviar className="btn-secondary mt-3 w-full">
        {guardado ? "Actualizar monto" : `Guardar recibo de ${tipo}`}
      </BotonEnviar>

      {estado.error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && estado.mensaje && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-800">
          <IconoCheck className="h-4 w-4" />
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
