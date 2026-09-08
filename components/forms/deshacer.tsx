"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

function BotonDeshacer() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn min-h-[44px] bg-white px-4 py-2 text-sm text-emerald-800 hover:bg-emerald-50"
    >
      {pending ? "Deshaciendo…" : "Me equivoqué, deshacer"}
    </button>
  );
}

// Confirmación grande tras registrar algo (6.8): dice QUÉ quedó guardado, con
// monto y fecha, y ofrece deshacerlo ahí mismo. Una línea verde chiquita no
// le quita el miedo a nadie; esto sí.
export function TarjetaHecho({
  detalle,
  accionDeshacer,
  campos,
  onDeshecho,
  extra,
}: {
  detalle: string;
  accionDeshacer: Accion;
  // Campos ocultos que necesita la acción de anular (p. ej. { pago_id: 12 }).
  campos: Record<string, string | number>;
  onDeshecho?: () => void;
  // Botón adicional fuera del formulario (p. ej. "Registrar otro").
  extra?: React.ReactNode;
}) {
  const [estado, formAction] = useFormState(accionDeshacer, ESTADO_INICIAL);
  useEffect(() => {
    if (estado.ok) onDeshecho?.();
  }, [estado, onDeshecho]);

  return (
    <div role="status" className="rounded-2xl bg-emerald-600 p-5 text-white shadow-sm">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-100">
        <IconoCheck className="h-4 w-4" />
        Listo, quedó guardado
      </p>
      <p className="mt-2 text-lg font-bold leading-snug">{detalle}</p>
      <p className="mt-1 text-sm text-emerald-100">
        Ya está en la caja. Si te equivocaste, puedes deshacerlo ahora mismo.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <form action={formAction} className="contents">
          {Object.entries(campos).map(([nombre, valor]) => (
            <input key={nombre} type="hidden" name={nombre} value={valor} />
          ))}
          <BotonDeshacer />
        </form>
        {extra}
      </div>
      {estado.error && (
        <p role="alert" className="mt-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium">
          {estado.error}
        </p>
      )}
    </div>
  );
}

// Botón secundario para acompañar a la tarjeta ("Registrar otro", "Cerrar").
export function BotonTarjeta({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn min-h-[44px] border border-white/40 bg-transparent px-4 py-2 text-sm text-white hover:bg-white/10"
    >
      {children}
    </button>
  );
}
