"use client";

import { useFormState } from "react-dom";
import { BotonEnviar } from "@/components/BotonEnviar";
import { IconoCheck } from "@/components/iconos";
import { ESTADO_INICIAL, type EstadoForm } from "@/lib/formularios";
import type { RolUsuario } from "@/lib/database.types";

type Accion = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

const ROLES: RolUsuario[] = ["admin", "tesoreria", "porteria"];

// Etiquetas locales (no importar de lib/roles: arrastra código de servidor).
const ETIQUETA_ROL: Record<RolUsuario, string> = {
  admin: "Administración",
  tesoreria: "Tesorería",
  porteria: "Portería",
  residente: "Residente",
};

function Mensajes({ estado }: { estado: EstadoForm }) {
  return (
    <>
      {estado.error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.ok && estado.mensaje && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-800">
          <IconoCheck className="h-4 w-4" />
          {estado.mensaje}
        </p>
      )}
    </>
  );
}

// Traspaso de cargo: cambiar el rol de un usuario (con confirmación).
export function FormCambiarRol({
  accion,
  userId,
  rolActual,
  nombre,
}: {
  accion: Accion;
  userId: string;
  rolActual: RolUsuario;
  nombre: string;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`¿Cambiar el rol de "${nombre}"? Quedará registrado en la bitácora.`))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="etiqueta">Rol</span>
          <select name="rol" defaultValue={rolActual} className="campo">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_ROL[r]}
              </option>
            ))}
          </select>
        </label>
        <BotonEnviar
          className="btn-secondary min-h-[48px] shrink-0 px-4"
          textoEnviando="…"
        >
          Guardar
        </BotonEnviar>
      </div>
      <Mensajes estado={estado} />
    </form>
  );
}

// Activar / desactivar un usuario.
export function FormAlternarActivo({
  accion,
  userId,
  activo,
}: {
  accion: Accion;
  userId: string;
  activo: boolean;
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (activo && !window.confirm("¿Desactivar este usuario? No podrá entrar hasta reactivarlo."))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="activar" value={String(!activo)} />
      <button
        type="submit"
        className={`rounded-lg px-2 py-1 text-xs font-bold underline underline-offset-2 ${
          activo
            ? "text-red-700 decoration-red-300 hover:bg-red-50"
            : "text-emerald-700 decoration-emerald-300 hover:bg-emerald-50"
        }`}
      >
        {activo ? "Desactivar" : "Activar"}
      </button>
      {estado.error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-700">
          {estado.error}
        </p>
      )}
    </form>
  );
}

// Alta / edición de un residente del padrón.
export function FormResidente({
  accion,
  dptos,
  residente,
}: {
  accion: Accion;
  dptos: number[];
  residente?: {
    id: number;
    dpto_id: number;
    nombre: string;
    email: string | null;
    telefono: string | null;
    es_propietario: boolean;
  };
}) {
  const [estado, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      {residente && <input type="hidden" name="id" value={residente.id} />}
      <div className="flex gap-3">
        <label className="w-28">
          <span className="etiqueta">Dpto</span>
          <select
            name="dpto_id"
            defaultValue={residente?.dpto_id ?? dptos[0]}
            className="campo"
          >
            {dptos.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1">
          <span className="etiqueta">Nombre</span>
          <input
            name="nombre"
            type="text"
            required
            maxLength={120}
            defaultValue={residente?.nombre ?? ""}
            className="campo"
            placeholder="Nombre y apellido"
          />
        </label>
      </div>
      <div className="flex gap-3">
        <label className="flex-1">
          <span className="etiqueta">Correo (para avisos)</span>
          <input
            name="email"
            type="email"
            defaultValue={residente?.email ?? ""}
            className="campo"
            placeholder="opcional"
          />
        </label>
        <label className="w-36">
          <span className="etiqueta">Teléfono</span>
          <input
            name="telefono"
            type="tel"
            defaultValue={residente?.telefono ?? ""}
            className="campo"
            placeholder="opcional"
          />
        </label>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="es_propietario"
          defaultChecked={residente?.es_propietario ?? true}
          className="h-5 w-5 accent-slate-900"
        />
        <span className="text-sm font-medium text-slate-700">Es propietario</span>
      </label>
      <BotonEnviar textoEnviando="Guardando…">
        {residente ? "Guardar cambios" : "Agregar residente"}
      </BotonEnviar>
      <Mensajes estado={estado} />
    </form>
  );
}

// Dar de baja / reactivar un residente.
export function FormAlternarResidente({
  accion,
  id,
  activo,
}: {
  accion: Accion;
  id: number;
  activo: boolean;
}) {
  const [, formAction] = useFormState(accion, ESTADO_INICIAL);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activar" value={String(!activo)} />
      <button
        type="submit"
        className={`rounded-lg px-2 py-1 text-xs font-bold underline underline-offset-2 ${
          activo
            ? "text-red-700 decoration-red-300 hover:bg-red-50"
            : "text-emerald-700 decoration-emerald-300 hover:bg-emerald-50"
        }`}
      >
        {activo ? "Dar de baja" : "Reactivar"}
      </button>
    </form>
  );
}
