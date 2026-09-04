"use client";

import { useEffect } from "react";
import Link from "next/link";

// Pantalla de error amigable. Sin esto, Next muestra el crudo
// "Application error: a client-side exception has occurred" en inglés, que no
// le dice absolutamente nada al portero ni a la tesorera (pasó de verdad).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Queda en la consola para poder diagnosticar si alguien reporta el error.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-10">
      <div className="card w-full max-w-md p-6 text-center">
        <p className="text-4xl" aria-hidden>
          😕
        </p>
        <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900">
          Algo se cortó
        </h1>
        <p className="mt-2 text-slate-600">
          No se pudo completar la acción. Lo que ya estaba guardado sigue ahí:
          no se perdió nada.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Si estabas subiendo fotos, intenta con menos fotos a la vez. Si vuelve
          a pasar, avisa a la administración.
        </p>

        <button onClick={reset} className="btn-primary mt-5 w-full">
          Volver a intentar
        </button>
        <Link
          href="/inicio"
          className="mt-3 inline-block text-sm font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-900"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
