"use client";

import { useState } from "react";
import { IconoCheck } from "@/components/iconos";

// Resumen del mes completo (los 10 dptos) para el grupo de WhatsApp del
// edificio: compartir directo o copiar el texto. El enlace a la página
// pública se agrega aquí (window.location.origin) para funcionar en
// cualquier dominio.
export function ResumenMes({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  function textoCompleto(): string {
    return `${texto}\n${window.location.origin}/transparencia`;
  }

  function abrirWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(textoCompleto())}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoCompleto());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador no deja copiar, no es crítico.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">
          Ver el texto que se enviará
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
          {texto} (enlace de esta página)
        </pre>
      </details>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={abrirWhatsApp}
          className="btn text-white sm:flex-1"
          style={{ backgroundColor: "#25D366" }}
        >
          Compartir por WhatsApp
        </button>
        <button type="button" onClick={copiar} className="btn-secondary sm:flex-1">
          {copiado ? (
            <>
              <IconoCheck className="h-4 w-4" /> Copiado
            </>
          ) : (
            "Copiar texto"
          )}
        </button>
      </div>
    </div>
  );
}
