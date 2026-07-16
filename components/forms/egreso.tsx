"use client";

import { useFormState, useFormStatus } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { CampoFoto } from "@/components/forms/CampoFoto";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function FormEgreso({
  accion,
  periodoId,
  categorias,
  fechaHoy,
  categoriaDefault,
  conceptoPlaceholder = "Ej. Sueldo vigilante, recibo Sedapal…",
}: {
  accion: Accion;
  periodoId: number;
  categorias: Array<{ id: number; nombre: string }>;
  fechaHoy: string;
  categoriaDefault?: number;
  conceptoPlaceholder?: string;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="periodo_id" value={periodoId} />
      <div>
        <label className="etiqueta" htmlFor="concepto">
          Concepto
        </label>
        <input
          id="concepto"
          name="concepto"
          type="text"
          required
          maxLength={120}
          className="campo"
          placeholder={conceptoPlaceholder}
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="etiqueta" htmlFor="categoria_id">
            Categoría
          </label>
          <select
            id="categoria_id"
            name="categoria_id"
            className="campo"
            required
            defaultValue={categoriaDefault ?? undefined}
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="etiqueta" htmlFor="monto_egreso">
            Monto (S/)
          </label>
          <input
            id="monto_egreso"
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
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="etiqueta" htmlFor="fecha_egreso">
            Fecha
          </label>
          <input
            id="fecha_egreso"
            name="fecha"
            type="date"
            required
            defaultValue={fechaHoy}
            className="campo"
          />
        </div>
        <label className="flex min-h-[48px] flex-1 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
          <input
            type="checkbox"
            name="pagado"
            defaultChecked
            className="h-5 w-5 accent-slate-900"
          />
          <span className="text-sm font-medium text-slate-700">Ya está pagado</span>
        </label>
      </div>
      <CampoFoto
        id="comprobante_egreso"
        name="comprobante"
        etiqueta="Comprobante o factura (opcional)"
      />
      <BotonEnviar textoEnviando="Registrando…">Registrar egreso</BotonEnviar>
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

function BotonChico({ texto, textoEnviando }: { texto: string; textoEnviando: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg px-2 py-1 text-xs font-bold text-slate-600 underline decoration-slate-300 underline-offset-2 transition hover:bg-slate-100 disabled:opacity-50"
    >
      {pending ? textoEnviando : texto}
    </button>
  );
}

// Alternar pagado / por pagar.
export function FormMarcarEgreso({
  accion,
  egresoId,
  pagado,
}: {
  accion: Accion;
  egresoId: number;
  pagado: boolean;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form action={formAction} className="inline-flex items-center gap-1">
      <input type="hidden" name="egreso_id" value={egresoId} />
      <input type="hidden" name="pagado" value={String(!pagado)} />
      <BotonChico
        texto={pagado ? "Marcar por pagar" : "Marcar pagado"}
        textoEnviando="Guardando…"
      />
      {estado.error && (
        <span role="alert" className="text-xs font-medium text-red-700">
          {estado.error}
        </span>
      )}
    </form>
  );
}

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

// Anular un egreso registrado por error (con confirmación).
export function FormAnularEgreso({
  accion,
  egresoId,
  descripcion,
}: {
  accion: Accion;
  egresoId: number;
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
            `¿Anular este egreso (${descripcion})? La anulación queda registrada en la bitácora.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="egreso_id" value={egresoId} />
      <BotonAnular />
      {estado.error && (
        <span role="alert" className="text-xs font-medium text-red-700">
          {estado.error}
        </span>
      )}
    </form>
  );
}
