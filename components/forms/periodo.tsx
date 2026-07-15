"use client";

import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";
import { nombreMes } from "@/lib/fechas";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

function Mensajes({ estado }: { estado: EstadoForm }) {
  return (
    <>
      {estado.error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && estado.mensaje && (
        <p className="mt-2 text-sm font-medium text-green-700">{estado.mensaje}</p>
      )}
    </>
  );
}

export function FormCrearPeriodo({
  accion,
  defaultAnio,
  defaultMes,
}: {
  accion: Accion;
  defaultAnio: number;
  defaultMes: number;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="mes" className="etiqueta">
            Mes
          </label>
          <select id="mes" name="mes" defaultValue={defaultMes} className="campo">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {nombreMes(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <label htmlFor="anio" className="etiqueta">
            Año
          </label>
          <input
            id="anio"
            name="anio"
            type="number"
            defaultValue={defaultAnio}
            min={2020}
            max={2100}
            className="campo"
          />
        </div>
      </div>
      <BotonEnviar textoEnviando="Creando…">Crear periodo en borrador</BotonEnviar>
      <Mensajes estado={estado} />
    </form>
  );
}

export function FormAccionPeriodo({
  accion,
  periodoId,
  texto,
  textoEnviando,
  className = "btn-primary",
  confirmar,
}: {
  accion: Accion;
  periodoId: number;
  texto: string;
  textoEnviando?: string;
  className?: string;
  confirmar?: string;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      <input type="hidden" name="periodo_id" value={periodoId} />
      <BotonEnviar className={className} textoEnviando={textoEnviando}>
        {texto}
      </BotonEnviar>
      <Mensajes estado={estado} />
    </form>
  );
}
