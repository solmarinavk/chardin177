"use client";

import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

function Mensajes({ estado }: { estado: EstadoForm }) {
  return (
    <>
      {estado.error && (
        <p role="alert" className="mt-1 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && estado.mensaje && (
        <p className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-800">
          <IconoCheck className="h-4 w-4" />
          {estado.mensaje}
        </p>
      )}
    </>
  );
}

// Admin: define el aporte mensual y si la provisión está activa.
export function FormConfigurarProvision({
  accion,
  provisionId,
  aporteActualCent,
  activo,
}: {
  accion: Accion;
  provisionId: number;
  aporteActualCent: number;
  activo: boolean;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="provision_id" value={provisionId} />
      <input type="hidden" name="activo" value={String(activo)} />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="etiqueta" htmlFor={`aporte_${provisionId}`}>
            Aporte mensual (S/)
          </label>
          <input
            id={`aporte_${provisionId}`}
            name="aporte"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            defaultValue={(aporteActualCent / 100).toFixed(2)}
            className="campo num"
          />
        </div>
        <BotonEnviar className="btn-secondary shrink-0 px-4" textoEnviando="…">
          Guardar
        </BotonEnviar>
      </div>
      <Mensajes estado={estado} />
    </form>
  );
}

// Tesorería/admin: registra un uso (o un aporte extra) de la provisión.
export function FormMovimientoProvision({
  accion,
  provisionId,
}: {
  accion: Accion;
  provisionId: number;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <details className="group mt-2">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-600 hover:text-slate-900">
        + Registrar uso o aporte
      </summary>
      <form action={formAction} className="mt-2 flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
        <input type="hidden" name="provision_id" value={provisionId} />
        <div className="flex gap-2">
          <div className="w-28">
            <label className="etiqueta" htmlFor={`tipo_${provisionId}`}>
              Tipo
            </label>
            <select id={`tipo_${provisionId}`} name="tipo" className="campo" defaultValue="uso">
              <option value="uso">Uso (−)</option>
              <option value="aporte">Aporte (+)</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="etiqueta" htmlFor={`monto_mov_${provisionId}`}>
              Monto (S/)
            </label>
            <input
              id={`monto_mov_${provisionId}`}
              name="monto"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              required
              className="campo num"
            />
          </div>
        </div>
        <div>
          <label className="etiqueta" htmlFor={`concepto_${provisionId}`}>
            Concepto
          </label>
          <input
            id={`concepto_${provisionId}`}
            name="concepto"
            type="text"
            required
            maxLength={120}
            className="campo"
            placeholder="Ej. Pago de gratificación de julio"
          />
        </div>
        <BotonEnviar className="btn-primary w-full">Registrar movimiento</BotonEnviar>
        <Mensajes estado={estado} />
      </form>
    </details>
  );
}
