"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { IconoCheck, IconoCamara } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";
import { CATEGORIAS_OCURRENCIA } from "@/lib/ocurrencias-cat";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

// Formulario para registrar una ocurrencia del cuaderno. Al guardar bien, se
// limpia solo para que el portero pueda anotar la siguiente sin recargar.
export function FormOcurrencia({ accion, hoy }: { accion: Accion; hoy: string }) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  const [nFotos, setNFotos] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) {
      formRef.current?.reset();
      setNFotos(0);
    }
  }, [estado]);

  return (
    <form ref={formRef} action={formAction} className="card flex flex-col gap-3 p-4">
      <div className="flex gap-3">
        <div className="w-1/2">
          <label htmlFor="fecha" className="etiqueta">
            Fecha
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={hoy}
            max={hoy}
            className="campo"
          />
        </div>
        <div className="w-1/2">
          <label htmlFor="categoria" className="etiqueta">
            Tipo
          </label>
          <select id="categoria" name="categoria" defaultValue="mantenimiento" className="campo">
            {CATEGORIAS_OCURRENCIA.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="titulo" className="etiqueta">
          ¿Qué pasó?
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          minLength={3}
          maxLength={120}
          placeholder="Ej.: Mantenimiento del montavehículo"
          className="campo"
        />
      </div>

      <div>
        <label htmlFor="detalle" className="etiqueta">
          Detalle (opcional)
        </label>
        <textarea
          id="detalle"
          name="detalle"
          rows={3}
          maxLength={1000}
          placeholder="Quién vino, observaciones, resultado…"
          className="campo"
        />
      </div>

      <div>
        <span className="etiqueta">Fotos de evidencia (opcional)</span>
        <input
          id="fotos"
          name="fotos"
          type="file"
          accept="image/*"
          multiple
          className="peer sr-only"
          onChange={(e) => setNFotos(e.target.files?.length ?? 0)}
        />
        <label
          htmlFor="fotos"
          className={`flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm font-medium transition peer-focus-visible:ring-2 peer-focus-visible:ring-slate-900 ${
            nFotos > 0
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          {nFotos > 0 ? (
            <>
              <IconoCheck className="h-4 w-4 shrink-0" />
              {nFotos} foto{nFotos === 1 ? "" : "s"} elegida{nFotos === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <IconoCamara className="h-4 w-4 shrink-0" />
              Agregar fotos (cámara o galería)
            </>
          )}
        </label>
      </div>

      <BotonEnviar className="btn-primary" textoEnviando="Guardando…">
        Guardar en el cuaderno
      </BotonEnviar>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && estado.mensaje && (
        <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          <IconoCheck className="h-4 w-4" />
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
