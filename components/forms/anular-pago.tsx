"use client";

import { useFormState } from "react-dom";
import { useFormStatus } from "react-dom";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

function BotonAnular() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg px-2 py-1 text-xs font-bold text-red-700 underline decoration-red-300 underline-offset-2 transition hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Anulando…" : "Anular"}
    </button>
  );
}

// Botón chico para anular un pago registrado por error (con confirmación).
export function FormAnularPago({
  accion,
  pagoId,
  periodoId,
  descripcion,
}: {
  accion: Accion;
  pagoId: number;
  periodoId: number;
  descripcion: string;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-1"
      onSubmit={(e) => {
        if (
          !window.confirm(
            `¿Anular este pago (${descripcion})? La cuota volverá a figurar como pendiente por ese monto. La anulación queda registrada en la bitácora.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="pago_id" value={pagoId} />
      <input type="hidden" name="periodo_id" value={periodoId} />
      <BotonAnular />
      {estado.error && (
        <span role="alert" className="text-xs font-medium text-red-700">
          {estado.error}
        </span>
      )}
    </form>
  );
}
