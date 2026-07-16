"use client";

import { useState } from "react";
import { IconoCheck } from "@/components/iconos";

// Botones para compartir el recibo: WhatsApp (wa.me), copiar e imprimir.
export function CompartirRecibo({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(texto)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador no deja copiar, no es crítico.
    }
  }

  return (
    <div className="flex flex-col gap-2 print:hidden sm:flex-row">
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="btn text-white sm:flex-1"
        style={{ backgroundColor: "#25D366" }}
      >
        Compartir por WhatsApp
      </a>
      <button type="button" onClick={copiar} className="btn-secondary sm:flex-1">
        {copiado ? (
          <>
            <IconoCheck className="h-4 w-4" /> Copiado
          </>
        ) : (
          "Copiar texto"
        )}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="btn-secondary sm:flex-1"
      >
        Imprimir
      </button>
    </div>
  );
}
