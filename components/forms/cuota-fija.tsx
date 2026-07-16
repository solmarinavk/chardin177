"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";
import { aSoles, formatoPEN, aCentimos } from "@/lib/centimos";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export type ValoresCuotaFija = {
  vigilancia_total_cent: number;
  manto_total_cent: number;
  materiales_dpto_cent: number;
  agua_comun_dpto_cent: number;
};

// Muestra "= S/ X por dpto" en vivo para los totales que el motor divide entre 10.
function PorDpto({ soles }: { soles: string }) {
  const n = Number(soles);
  if (!Number.isFinite(n) || n <= 0) return null;
  return (
    <p className="mt-1 text-xs text-slate-500">
      = {formatoPEN(Math.round(aCentimos(n) / 10))} por departamento (÷ 10)
    </p>
  );
}

export function FormCuotaFija({
  accion,
  actuales,
  hoy,
}: {
  accion: Accion;
  actuales: ValoresCuotaFija | null;
  hoy: string;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  const [vig, setVig] = useState(
    actuales ? String(aSoles(actuales.vigilancia_total_cent)) : "",
  );
  const [man, setMan] = useState(
    actuales ? String(aSoles(actuales.manto_total_cent)) : "",
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="etiqueta" htmlFor="vigente_desde">
          Rige desde
        </label>
        <input
          id="vigente_desde"
          name="vigente_desde"
          type="date"
          required
          defaultValue={hoy}
          className="campo"
        />
        <p className="mt-1 text-xs text-slate-500">
          El primer día del mes que uses aquí. Afecta los cálculos futuros; los
          meses ya emitidos no cambian.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="etiqueta" htmlFor="vigilancia_total">
            Vigilancia (total edificio, S/)
          </label>
          <input
            id="vigilancia_total"
            name="vigilancia_total"
            type="number"
            step="0.01"
            min="0"
            required
            value={vig}
            onChange={(e) => setVig(e.target.value)}
            className="campo"
          />
          <PorDpto soles={vig} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="manto_total">
            Mantenimiento (total edificio, S/)
          </label>
          <input
            id="manto_total"
            name="manto_total"
            type="number"
            step="0.01"
            min="0"
            required
            value={man}
            onChange={(e) => setMan(e.target.value)}
            className="campo"
          />
          <PorDpto soles={man} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="etiqueta" htmlFor="materiales_dpto">
            Materiales (por dpto, S/)
          </label>
          <input
            id="materiales_dpto"
            name="materiales_dpto"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={actuales ? aSoles(actuales.materiales_dpto_cent) : ""}
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="agua_comun_dpto">
            Agua común (por dpto, S/)
          </label>
          <input
            id="agua_comun_dpto"
            name="agua_comun_dpto"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={actuales ? aSoles(actuales.agua_comun_dpto_cent) : ""}
            className="campo"
          />
        </div>
      </div>

      <div>
        <label className="etiqueta" htmlFor="notas">
          Nota (opcional)
        </label>
        <input
          id="notas"
          name="notas"
          type="text"
          maxLength={200}
          className="campo"
          placeholder="Ej. Aumento de vigilancia acordado en junta"
        />
      </div>

      <BotonEnviar textoEnviando="Guardando…">Guardar nueva versión</BotonEnviar>
      {estado.error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && estado.mensaje && (
        <p className="flex items-start gap-1.5 text-sm font-medium text-emerald-800">
          <IconoCheck className="mt-0.5 h-4 w-4 shrink-0" />
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
