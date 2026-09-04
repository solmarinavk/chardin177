"use client";

import { useFormStatus } from "react-dom";

// Botón de envío que se deshabilita y muestra "…" mientras el formulario procesa.
export function BotonEnviar({
  children,
  className = "btn-primary w-full",
  textoEnviando = "Guardando…",
  deshabilitado = false,
}: {
  children: React.ReactNode;
  className?: string;
  textoEnviando?: string;
  // Para bloquear el envío por una razón externa al formulario (p. ej. mientras
  // se comprimen las fotos en el celular antes de subirlas).
  deshabilitado?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || deshabilitado} className={className}>
      {pending ? textoEnviando : children}
    </button>
  );
}
