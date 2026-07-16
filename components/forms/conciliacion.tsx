"use client";

import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

// Botón "Aplicar" del cuadre: reenvía el rango + facturado; el servidor
// recomputa y genera los ajustes en el borrador.
export function FormAplicarConciliacion({
  accion,
  desdeId,
  hastaId,
  facturadoCent,
}: {
  accion: Accion;
  desdeId: number;
  hastaId: number;
  facturadoCent: number;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("¿Aplicar estos ajustes al borrador del mes?"))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="desde" value={desdeId} />
      <input type="hidden" name="hasta" value={hastaId} />
      <input type="hidden" name="facturado" value={(facturadoCent / 100).toFixed(2)} />
      <BotonEnviar className="btn-primary w-full" textoEnviando="Aplicando…">
        Aplicar ajustes al borrador
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
