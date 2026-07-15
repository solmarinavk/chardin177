"use client";

import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

const MEDIOS = [
  { valor: "yape", texto: "Yape" },
  { valor: "plin", texto: "Plin" },
  { valor: "transferencia", texto: "Transferencia" },
  { valor: "efectivo", texto: "Efectivo" },
  { valor: "otro", texto: "Otro" },
];

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
  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2">
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input type="hidden" name="cuota_id" value={cuotaId} />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="etiqueta" htmlFor={`monto_${cuotaId}`}>
            Monto (S/)
          </label>
          <input
            id={`monto_${cuotaId}`}
            name="monto"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={(Math.max(saldoPendienteCent, 0) / 100).toFixed(2)}
            className="campo"
          />
        </div>
        <div className="flex-1">
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
          Medio
        </label>
        <select id={`medio_${cuotaId}`} name="medio" defaultValue="transferencia" className="campo">
          {MEDIOS.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.texto}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="etiqueta" htmlFor={`comprobante_${cuotaId}`}>
          Comprobante (opcional)
        </label>
        <input
          id={`comprobante_${cuotaId}`}
          name="comprobante"
          type="file"
          accept="image/*"
          className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2"
        />
      </div>
      <BotonEnviar className="btn-primary w-full" textoEnviando="Registrando…">
        Registrar pago
      </BotonEnviar>
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
