"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { CampoFoto } from "@/components/forms/CampoFoto";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

const MEDIOS = [
  { valor: "yape", texto: "Yape" },
  { valor: "plin", texto: "Plin" },
  { valor: "transferencia", texto: "Transferencia" },
  { valor: "efectivo", texto: "Efectivo" },
  { valor: "otro", texto: "Otro" },
];

// 5.4d · El medio de pago recuerda el último usado en este dispositivo (los
// vecinos casi siempre pagan por el mismo canal).
const CLAVE_MEDIO = "chardin_ultimo_medio";

export function FormPago({
  accion,
  periodoId,
  cuotaId,
  saldoPendienteCent,
  fechaHoy,
}: {
  accion: Accion;
  periodoId: number;
  cuotaId: number;
  saldoPendienteCent: number;
  fechaHoy: string;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  const [medio, setMedio] = useState("transferencia");
  useEffect(() => {
    const guardado = window.localStorage.getItem(CLAVE_MEDIO);
    if (guardado && MEDIOS.some((m) => m.valor === guardado)) setMedio(guardado);
  }, []);
  return (
    <form
      action={formAction}
      className="mt-3 flex flex-col gap-3 rounded-xl bg-slate-50 p-3"
    >
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input type="hidden" name="cuota_id" value={cuotaId} />
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <label className="etiqueta" htmlFor={`monto_${cuotaId}`}>
            Monto (S/)
          </label>
          <input
            id={`monto_${cuotaId}`}
            name="monto"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            required
            defaultValue={(Math.max(saldoPendienteCent, 0) / 100).toFixed(2)}
            className="campo num"
          />
        </div>
        <div className="w-36 shrink-0">
          <label className="etiqueta" htmlFor={`fecha_${cuotaId}`}>
            Fecha
          </label>
          <input
            id={`fecha_${cuotaId}`}
            name="fecha"
            type="date"
            required
            defaultValue={fechaHoy}
            className="campo"
          />
        </div>
      </div>
      <div>
        <label className="etiqueta" htmlFor={`medio_${cuotaId}`}>
          Medio de pago
        </label>
        <select
          id={`medio_${cuotaId}`}
          name="medio"
          value={medio}
          onChange={(e) => {
            setMedio(e.target.value);
            window.localStorage.setItem(CLAVE_MEDIO, e.target.value);
          }}
          className="campo"
        >
          {MEDIOS.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.texto}
            </option>
          ))}
        </select>
      </div>
      <CampoFoto
        id={`comprobante_${cuotaId}`}
        name="comprobante"
        etiqueta="Comprobante: captura del yape o voucher (opcional)"
      />
      <BotonEnviar className="btn-primary w-full" textoEnviando="Registrando…">
        Registrar pago
      </BotonEnviar>
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
