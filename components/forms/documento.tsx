"use client";

import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function FormDocumento({ accion }: { accion: Accion }) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="etiqueta" htmlFor="titulo">
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          maxLength={140}
          className="campo"
          placeholder="Ej. Reglamento interno, Acta de junta, Excel histórico"
        />
      </div>
      <div>
        <label className="etiqueta" htmlFor="categoria">
          Categoría (opcional)
        </label>
        <input
          id="categoria"
          name="categoria"
          type="text"
          maxLength={60}
          className="campo"
          placeholder="reglamento · acta · presupuesto · histórico"
        />
      </div>
      <div>
        <label className="etiqueta" htmlFor="archivo">
          Archivo
        </label>
        <input
          id="archivo"
          name="archivo"
          type="file"
          required
          className="block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
      </div>
      <BotonEnviar textoEnviando="Subiendo…">Subir documento</BotonEnviar>
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
