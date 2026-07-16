"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/roles";
import { enteroDesdeInput, type EstadoForm } from "@/lib/formularios";
import type { RolUsuario } from "@/lib/database.types";

// Roles con login (el "residente" ya no existe como usuario).
const ROLES: RolUsuario[] = ["admin", "tesoreria", "porteria"];

function mensajeError(error: { code?: string; message: string }): string {
  if (error.code === "42501") return "No tienes permiso para esta acción.";
  return error.message;
}

// ¿Quedaría el edificio sin ningún admin activo tras el cambio?
async function quedaSinAdmin(
  s: ReturnType<typeof createClient>,
  userIdQueCambia: string,
): Promise<boolean> {
  const { data } = await s
    .from("perfiles")
    .select("user_id")
    .eq("rol", "admin")
    .eq("activo", true)
    .neq("user_id", userIdQueCambia);
  return (data ?? []).length === 0;
}

// Traspaso de cargo: cambia el rol de un usuario. Solo admin. Queda en la
// bitácora (trigger de auditoría sobre perfiles).
export async function cambiarRol(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const yo = await requireRol(["admin"]);
  const userId = String(formData.get("user_id") ?? "").trim();
  const rol = String(formData.get("rol") ?? "").trim();
  if (!userId) return { ok: false, error: "Usuario inválido." };
  if (!ROLES.includes(rol as RolUsuario))
    return { ok: false, error: "Rol inválido." };

  const s = createClient();
  // Salvaguarda: no dejar el edificio sin ningún admin.
  if (rol !== "admin" && (await quedaSinAdmin(s, userId))) {
    return {
      ok: false,
      error: "No puedes quitar el último administrador. Nombra otro admin primero.",
    };
  }
  if (userId === yo.user_id && rol !== "admin") {
    return {
      ok: false,
      error: "No te quites a ti mismo el rol de admin; pídele a otro admin que lo haga.",
    };
  }

  const { error } = await s
    .from("perfiles")
    .update({ rol: rol as RolUsuario })
    .eq("user_id", userId);
  if (error) return { ok: false, error: mensajeError(error) };

  revalidatePath("/usuarios");
  return { ok: true, error: null, mensaje: "Rol actualizado." };
}

// Activa / desactiva un usuario (sin borrarlo). Solo admin.
export async function alternarActivo(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["admin"]);
  const userId = String(formData.get("user_id") ?? "").trim();
  const activar = formData.get("activar") === "true";
  if (!userId) return { ok: false, error: "Usuario inválido." };

  const s = createClient();
  if (!activar && (await quedaSinAdmin(s, userId))) {
    const { data: objetivo } = await s
      .from("perfiles")
      .select("rol")
      .eq("user_id", userId)
      .maybeSingle();
    if (objetivo?.rol === "admin")
      return {
        ok: false,
        error: "No puedes desactivar al último administrador activo.",
      };
  }

  const { error } = await s
    .from("perfiles")
    .update({ activo: activar })
    .eq("user_id", userId);
  if (error) return { ok: false, error: mensajeError(error) };

  revalidatePath("/usuarios");
  return { ok: true, error: null, mensaje: activar ? "Usuario activado." : "Usuario desactivado." };
}

// Crea o edita un residente del padrón. Solo admin (RLS w_residentes).
export async function guardarResidente(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["admin"]);
  const id = enteroDesdeInput(formData.get("id")); // null = nuevo
  const dptoId = enteroDesdeInput(formData.get("dpto_id"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const esPropietario = formData.get("es_propietario") === "on";

  if (dptoId === null) return { ok: false, error: "Elige el departamento." };
  if (!nombre) return { ok: false, error: "Escribe el nombre del residente." };

  const s = createClient();
  const fila = {
    dpto_id: dptoId,
    nombre,
    email,
    telefono,
    es_propietario: esPropietario,
  };
  const { error } =
    id !== null
      ? await s.from("residentes").update(fila).eq("id", id)
      : await s.from("residentes").insert({ ...fila, activo: true });
  if (error) return { ok: false, error: mensajeError(error) };

  revalidatePath("/usuarios");
  return {
    ok: true,
    error: null,
    mensaje: id !== null ? "Residente actualizado." : "Residente agregado.",
  };
}

// Activa / desactiva un residente (ej. cuando se muda). Solo admin.
export async function alternarResidente(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireRol(["admin"]);
  const id = enteroDesdeInput(formData.get("id"));
  const activar = formData.get("activar") === "true";
  if (id === null) return { ok: false, error: "Residente inválido." };

  const s = createClient();
  const { error } = await s
    .from("residentes")
    .update({ activo: activar })
    .eq("id", id);
  if (error) return { ok: false, error: mensajeError(error) };

  revalidatePath("/usuarios");
  return { ok: true, error: null, mensaje: activar ? "Residente reactivado." : "Residente dado de baja." };
}
