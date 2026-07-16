import { IconoDescarga } from "@/components/iconos";

// Botón "Descargar Excel". Es un enlace normal (descarga directa del route
// handler /api/exportar), por eso usa <a> y no next/link.
export function BotonExcel({
  href,
  texto = "Descargar Excel",
  className = "",
}: {
  href: string;
  texto?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`btn-secondary min-h-[40px] px-3 py-2 text-sm ${className}`}
    >
      <IconoDescarga className="h-4 w-4" />
      {texto}
    </a>
  );
}
