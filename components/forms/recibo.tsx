"use client";

import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
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
  const etiqueta = tipo === "agua" ? "Recibo de agua (Sedapal)" : "Recibo de luz común";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input type="hidden" name="tipo" value={tipo} />
      <div>
        <label htmlFor={`monto_${tipo}`} className="etiqueta">
          {etiqueta} — monto en soles
        </label>
        <input
          id={`monto_${tipo}`}
          name="monto"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          required
          defaultValue={
            montoActualCent !== null ? (montoActualCent / 100).toFixed(2) : ""
          }
          className="campo"
          placeholder="Ej. 488.70"
        />
      </div>
      <div>
        <label htmlFor={`foto_${tipo}`} className="etiqueta">
          Foto del recibo (opcional)
        </label>
        <input
          id={`foto_${tipo}`}
          name="foto"
          type="file"
          accept="image/*"
          className="campo file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2"
        />
      </div>
      <BotonEnviar className="btn-secondary w-full">Guardar recibo de {tipo}</BotonEnviar>
      {estado.error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && estado.mensaje && (
        <p className="text-sm font-medium text-green-700">{estado.mensaje}</p>
      )}
    </form>
  );
}
