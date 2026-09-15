"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { CampoFoto } from "@/components/forms/CampoFoto";
import { TarjetaHecho, BotonTarjeta } from "@/components/forms/deshacer";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";
import { formatoPEN } from "@/lib/centimos";
import type { GastoFrecuente } from "@/lib/gastos-frecuentes";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export type ValoresEgreso = {
  concepto: string;
  categoria_id: number | null;
  monto_cent: number;
};

function aTexto(v: ValoresEgreso | null | undefined) {
  return {
    concepto: v?.concepto ?? "",
    categoria: v?.categoria_id == null ? "" : String(v.categoria_id),
    monto: v ? (v.monto_cent / 100).toFixed(2) : "",
  };
}

export function FormEgreso({
  accion,
  accionAnular,
  periodoId,
  categorias,
  fechaHoy,
  categoriaDefault,
  conceptoPlaceholder = "Ej. Sueldo vigilante, recibo Sedapal…",
  frecuentes = [],
  inicial = null,
}: {
  accion: Accion;
  // Para el botón Deshacer de la confirmación (6.8).
  accionAnular?: Accion;
  periodoId: number;
  categorias: Array<{ id: number; nombre: string }>;
  fechaHoy: string;
  categoriaDefault?: number;
  conceptoPlaceholder?: string;
  // 6.8 · Gastos frecuentes de un toque: botones que llenan el formulario.
  frecuentes?: GastoFrecuente[];
  // Valores con los que abrir el formulario (p. ej. viniendo del checklist).
  inicial?: ValoresEgreso | null;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  const formRef = useRef<HTMLFormElement>(null);

  const base = aTexto(inicial);
  const [concepto, setConcepto] = useState(base.concepto);
  const [categoria, setCategoria] = useState(
    base.categoria || (categoriaDefault == null ? "" : String(categoriaDefault)),
  );
  const [monto, setMonto] = useState(base.monto);
  const [elegido, setElegido] = useState<string | null>(null);

  // Tarjeta de "Listo": se muestra hasta que la persona la cierre o deshaga.
  const [descartado, setDescartado] = useState<number | null>(null);
  const hecho =
    estado.ok && estado.hecho && estado.hecho.id !== descartado ? estado.hecho : null;
  const [ultimoHecho, setUltimoHecho] = useState<number | null>(null);
  useEffect(() => {
    if (!hecho || hecho.id === ultimoHecho) return;
    // Recién registrado: se limpia el formulario para el siguiente.
    setUltimoHecho(hecho.id);
    setConcepto("");
    setMonto("");
    setElegido(null);
    formRef.current?.reset();
  }, [hecho, ultimoHecho]);

  function aplicar(g: GastoFrecuente) {
    const v = aTexto(g);
    setConcepto(v.concepto);
    setCategoria(v.categoria);
    setMonto(v.monto);
    setElegido(g.clave);
  }

  return (
    <div className="flex flex-col gap-3">
      {hecho && accionAnular && (
        <TarjetaHecho
          detalle={hecho.detalle}
          accionDeshacer={accionAnular}
          campos={{ egreso_id: hecho.id }}
          onDeshecho={() => setDescartado(hecho.id)}
          extra={
            <BotonTarjeta onClick={() => setDescartado(hecho.id)}>
              Registrar otro gasto
            </BotonTarjeta>
          }
        />
      )}

      {frecuentes.length > 0 && (
        <div>
          <p className="etiqueta">Gastos frecuentes (un toque y solo confirmas)</p>
          <div className="flex flex-wrap gap-2">
            {frecuentes.map((g) => (
              <button
                key={g.clave}
                type="button"
                onClick={() => aplicar(g)}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                  elegido === g.clave
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {g.concepto}
                <span className={`num ml-1.5 font-bold ${elegido === g.clave ? "text-white" : "text-slate-500"}`}>
                  {formatoPEN(g.monto_cent)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
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
            value={concepto}
            onChange={(e) => {
              setConcepto(e.target.value);
              setElegido(null);
            }}
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
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {categoria === "" && <option value="">Elige una…</option>}
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
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
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

        {/* Aviso de doble registro: no borra lo escrito, solo pide confirmar. */}
        {estado.confirmar && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200"
          >
            <p className="text-sm font-semibold text-amber-900">
              Ojo: esto parece un gasto repetido
            </p>
            <p className="text-sm text-amber-800">{estado.confirmar}</p>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-amber-200">
              <input
                type="checkbox"
                name="confirmar_duplicado"
                className="h-5 w-5 accent-amber-600"
              />
              <span className="text-sm font-medium text-amber-900">
                Sí, es un pago distinto. Regístralo igual.
              </span>
            </label>
          </div>
        )}

        <BotonEnviar textoEnviando="Registrando…">Registrar egreso</BotonEnviar>
        {estado.error && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {estado.error}
          </p>
        )}
        {estado.ok && estado.mensaje && !estado.hecho && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
            <IconoCheck className="h-4 w-4" />
            {estado.mensaje}
          </p>
        )}
      </form>
    </div>
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
