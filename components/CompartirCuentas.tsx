"use client";

// 5.4f · Comparte por WhatsApp el resumen del mes + el enlace de esta página.
// El enlace se arma en el navegador (window.location), así funciona igual en
// el deploy real y en cualquier dominio.
export function CompartirCuentas({ resumen }: { resumen: string }) {
  function abrir() {
    const url = `${window.location.origin}/transparencia`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${resumen}\n${url}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  return (
    <button
      type="button"
      onClick={abrir}
      className="btn w-full text-white"
      style={{ backgroundColor: "#25D366" }}
    >
      Compartir por WhatsApp
    </button>
  );
}
