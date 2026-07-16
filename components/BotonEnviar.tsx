"use client";

import { useFormStatus } from "react-dom";

// Botón de envío que se deshabilita y muestra "…" mientras el formulario procesa.
export function BotonEnviar({
  children,
  className = "btn-primary w-full",
  textoEnviando = "Guardando…",
}: {
  children: React.ReactNode;
  className?: string;
  textoEnviando?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? textoEnviando : children}
    </button>
  );
}
