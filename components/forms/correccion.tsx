"use client";

import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

// Corregir un error de un mes ya cerrado. Un mes cerrado no se toca nunca: la
// corrección entra como una línea nueva en el mes abierto, a la vista de todos.
export function FormCorreccion({
  accion,
  periodoId,
  categorias,
  fechaHoy,
  etiquetaMes,
}: {
  accion: Accion;
  periodoId: number;
  categorias: Array<{ id: number; nombre: string }>;
  fechaHoy: string;
  etiquetaMes: string;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="periodo_id" value={periodoId} />

      <div>
        <label className="etiqueta" htmlFor="concepto_correccion">
          ¿Qué se está corrigiendo?
        </label>
        <input
          id="concepto_correccion"
          name="concepto"
          type="text"
          required
          maxLength={120}
          className="campo"
          placeholder="Ej. Sedapal de agosto que se registró dos veces"
        />
        <p className="mt-1 text-xs text-slate-500">
          Escríbelo claro: esto se ve en la caja y en la página pública.
        </p>
      </div>

      <fieldset>
        <legend className="etiqueta">¿Hacia dónde va la plata?</legend>
        <div className="flex flex-col gap-2">
          <label className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
            <input
              type="radio"
              name="direccion"
              value="devolver"
              defaultChecked
              className="h-5 w-5 accent-emerald-600"
            />
            <span className="text-sm font-medium text-slate-700">
              <strong>Vuelve</strong> a la caja — se cobró de más o se registró
              un gasto que no existió
            </span>
          </label>
          <label className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
            <input
              type="radio"
              name="direccion"
              value="sacar"
              className="h-5 w-5 accent-red-600"
            />
            <span className="text-sm font-medium text-slate-700">
              <strong>Sale</strong> de la caja — faltó registrar un gasto de un
              mes cerrado
            </span>
          </label>
        </div>
      </fieldset>

      <div className="flex gap-3">
        <div className="w-32">
          <label className="etiqueta" htmlFor="monto_correccion">
            Monto (S/)
          </label>
          <input
            id="monto_correccion"
            name="monto"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            required
            className="campo num"
          />
        </div>
        <div className="flex-1">
          <label className="etiqueta" htmlFor="fecha_correccion">
            Fecha
          </label>
          <input
            id="fecha_correccion"
            name="fecha"
            type="date"
            required
            defaultValue={fechaHoy}
            className="campo"
          />
        </div>
      </div>

      <div>
        <label className="etiqueta" htmlFor="categoria_correccion">
          Categoría
        </label>
        <select
          id="categoria_correccion"
          name="categoria_id"
          className="campo"
          required
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        La corrección se anota en <strong>{etiquetaMes}</strong>. El mes cerrado
        no se modifica: su historia queda tal cual, y aquí se ve por qué cambió
        el saldo.
      </p>

      <BotonEnviar textoEnviando="Registrando…">
        Registrar corrección
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
