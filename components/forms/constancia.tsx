"use client";

import { useFormState, useFormStatus } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { CampoFoto } from "@/components/forms/CampoFoto";
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

// El vecino sube su constancia de pago.
export function FormSubirConstancia({
  accion,
  periodoId,
  dptos,
  dptoFijo,
}: {
  accion: Accion;
  periodoId: number;
  dptos: number[];
  dptoFijo: number | null;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="periodo_id" value={periodoId} />
      {dptoFijo != null && <input type="hidden" name="dpto_id" value={dptoFijo} />}

      {dptoFijo == null && (
        <div>
          <label className="etiqueta" htmlFor="constancia_dpto">
            Tu departamento
          </label>
          <select id="constancia_dpto" name="dpto_id" required className="campo">
            <option value="" disabled>
              Elige…
            </option>
            {dptos.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="etiqueta" htmlFor="constancia_monto">
          Monto que pagaste (S/) — opcional
        </label>
        <input
          id="constancia_monto"
          name="monto"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          className="campo num"
          placeholder="Ej. 458.13"
        />
      </div>

      <CampoFoto
        id="constancia_foto"
        name="foto"
        etiqueta="Foto del yape / voucher"
      />

      <div>
        <label className="etiqueta" htmlFor="constancia_nota">
          Nota (opcional)
        </label>
        <input
          id="constancia_nota"
          name="nota"
          type="text"
          maxLength={120}
          className="campo"
          placeholder="Ej. Pagué por Yape el 12/07"
        />
      </div>

      <BotonEnviar textoEnviando="Enviando…">Enviar constancia</BotonEnviar>
      <Mensajes estado={estado} />
    </form>
  );
}

const MEDIOS = [
  { valor: "yape", texto: "Yape" },
  { valor: "plin", texto: "Plin" },
  { valor: "transferencia", texto: "Transferencia" },
  { valor: "efectivo", texto: "Efectivo" },
  { valor: "otro", texto: "Otro" },
];

// Tesorería confirma la constancia → crea el pago.
export function FormConfirmarConstancia({
  accion,
  constanciaId,
  periodoId,
  montoSugeridoCent,
}: {
  accion: Accion;
  constanciaId: number;
  periodoId: number;
  montoSugeridoCent: number;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2 rounded-xl bg-white p-2">
      <input type="hidden" name="constancia_id" value={constanciaId} />
      <input type="hidden" name="periodo_id" value={periodoId} />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="etiqueta" htmlFor={`cmonto_${constanciaId}`}>
            Monto (S/)
          </label>
          <input
            id={`cmonto_${constanciaId}`}
            name="monto"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={
              montoSugeridoCent > 0 ? (montoSugeridoCent / 100).toFixed(2) : ""
            }
            className="campo num"
          />
        </div>
        <div className="flex-1">
          <label className="etiqueta" htmlFor={`cmedio_${constanciaId}`}>
            Medio
          </label>
          <select
            id={`cmedio_${constanciaId}`}
            name="medio"
            defaultValue="transferencia"
            className="campo"
          >
            {MEDIOS.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.texto}
              </option>
            ))}
          </select>
        </div>
      </div>
      <BotonEnviar className="btn-primary w-full" textoEnviando="Confirmando…">
        Confirmar y registrar pago
      </BotonEnviar>
      <Mensajes estado={estado} />
    </form>
  );
}

function BotonRechazar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg px-2 py-1 text-xs font-bold text-red-700 underline decoration-red-300 underline-offset-2 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "…" : "Rechazar"}
    </button>
  );
}

export function FormRechazarConstancia({
  accion,
  constanciaId,
  periodoId,
}: {
  accion: Accion;
  constanciaId: number;
  periodoId: number;
}) {
  const [, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm("¿Rechazar esta constancia?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="constancia_id" value={constanciaId} />
      <input type="hidden" name="periodo_id" value={periodoId} />
      <BotonRechazar />
    </form>
  );
}
