"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FormPago } from "@/components/forms/pago";
import { TarjetaHecho, BotonTarjeta } from "@/components/forms/deshacer";
import { IconoCheck, IconoFlecha } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";
import { formatoPEN } from "@/lib/centimos";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

// 6.8 · La parte de abajo de cada dpto en la cobranza: "Pagado", o el
// formulario de pago, o —recién registrado— la tarjeta grande con Deshacer.
//
// Vive como componente cliente aparte porque el estado del formulario tiene
// que sobrevivir al refresco del servidor: cuando el pago completa la cuota,
// el servidor deja de pintar el formulario, y si la confirmación viviera
// dentro de él desaparecería justo cuando más falta hace.
export function CobranzaDpto({
  periodoId,
  cuotaId,
  dpto,
  saldoPendienteCent,
  fechaHoy,
  abrirPago,
  accion,
  accionAnular,
}: {
  periodoId: number;
  cuotaId: number;
  dpto: number;
  saldoPendienteCent: number;
  fechaHoy: string;
  abrirPago: boolean;
  accion: Accion;
  accionAnular: Accion;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  const [descartado, setDescartado] = useState<number | null>(null);
  const [abierto, setAbierto] = useState(abrirPago);

  const hecho =
    estado.ok && estado.hecho && estado.hecho.id !== descartado ? estado.hecho : null;

  if (hecho) {
    return (
      <div className="mt-2">
        <TarjetaHecho
          detalle={hecho.detalle}
          accionDeshacer={accionAnular}
          campos={{ pago_id: hecho.id, periodo_id: periodoId }}
          onDeshecho={() => {
            setDescartado(hecho.id);
            setAbierto(true);
          }}
          extra={
            <BotonTarjeta
              onClick={() => {
                setDescartado(hecho.id);
                setAbierto(saldoPendienteCent > 0);
              }}
            >
              {saldoPendienteCent > 0 ? "Registrar otro pago" : "Seguir con el siguiente"}
            </BotonTarjeta>
          }
        />
      </div>
    );
  }

  if (saldoPendienteCent <= 0) {
    return (
      <p className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-700">
        <IconoCheck className="h-4 w-4" />
        Pagado
      </p>
    );
  }

  return (
    <details className="group" open={abierto} onToggle={(e) => setAbierto(e.currentTarget.open)}>
      <summary className="mt-1 flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
        <IconoFlecha className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        Registrar pago
        <span className="num font-normal text-slate-500">
          (debe {formatoPEN(saldoPendienteCent)})
        </span>
      </summary>
      <FormPago
        accion={accion}
        periodoId={periodoId}
        cuotaId={cuotaId}
        saldoPendienteCent={saldoPendienteCent}
        fechaHoy={fechaHoy}
        estado={estado}
        formAction={formAction}
      />
      <p className="sr-only">Departamento {dpto}</p>
    </details>
  );
}
