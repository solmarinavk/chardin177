"use client";

import { useState } from "react";
import { IconoCamara, IconoCheck } from "@/components/iconos";

// Campo de foto amigable: un botón grande que abre la cámara/galería y
// muestra el nombre del archivo elegido. `camara` fuerza la cámara trasera
// (ideal para la foto del medidor).
export function CampoFoto({
  id,
  name,
  etiqueta = "Agregar foto (opcional)",
  camara = false,
}: {
  id: string;
  name: string;
  etiqueta?: string;
  camara?: boolean;
}) {
  const [nombre, setNombre] = useState<string | null>(null);

  return (
    <div>
      <input
        id={id}
        name={name}
        type="file"
        accept="image/*"
        {...(camara ? { capture: "environment" as const } : {})}
        className="peer sr-only"
        onChange={(e) => setNombre(e.target.files?.[0]?.name ?? null)}
      />
      <label
        htmlFor={id}
        className={`flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm font-medium transition peer-focus-visible:ring-2 peer-focus-visible:ring-slate-900 ${
          nombre
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
        }`}
      >
        {nombre ? (
          <>
            <IconoCheck className="h-4 w-4 shrink-0" />
            <span className="truncate">{nombre}</span>
          </>
        ) : (
          <>
            <IconoCamara className="h-4 w-4 shrink-0" />
            {etiqueta}
          </>
        )}
      </label>
    </div>
  );
}
