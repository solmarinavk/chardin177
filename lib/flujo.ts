// El "GPS del mes": dado el periodo y sus datos, dice qué pasos ya se hicieron
// y cuál toca ahora. Lógica pura (sin base de datos) para poder testearla y
// usarla en cualquier pantalla.

import type { EstadoPeriodo } from "@/lib/database.types";

export type PeriodoLite = {
  id: number;
  estado: EstadoPeriodo;
  anio: number;
  mes: number;
};

export type DatosFlujo = {
  lecturas: number; // cuántas de las 10 lecturas ya están
  reciboAgua: boolean;
  reciboLuz: boolean;
  cuotas: number; // cuántas cuotas calculadas (10 = listo)
  cuotasPagadas: number; // cuotas en estado 'pagado'
};

export type EstadoPaso = "hecho" | "actual" | "pendiente" | "bloqueado";

export type Paso = {
  clave: "lecturas" | "recibos" | "calcular" | "emitir" | "pagos" | "cerrar";
  titulo: string;
  descripcion: string;
  detalle: string | null; // avance corto, ej. "7/10"
  estado: EstadoPaso;
  href: string | null; // a dónde ir para hacerlo
  cta: string; // texto del botón de acción
};

export function pasosDelMes(p: PeriodoLite, d: DatosFlujo): Paso[] {
  const base = `/periodos/${p.id}`;
  const emitidoOCerrado = p.estado === "emitido" || p.estado === "cerrado";
  const recibosListos = d.reciboAgua && d.reciboLuz;
  const nRecibos = (d.reciboAgua ? 1 : 0) + (d.reciboLuz ? 1 : 0);

  const pasos: Paso[] = [
    {
      clave: "lecturas",
      titulo: "Lecturas de agua",
      descripcion: "El portero ingresa la lectura de los 10 medidores.",
      detalle: `${d.lecturas}/10`,
      estado: emitidoOCerrado || d.lecturas === 10 ? "hecho" : "pendiente",
      href: "/lecturas",
      cta: "Ingresar lecturas",
    },
    {
      clave: "recibos",
      titulo: "Recibos del mes",
      descripcion: "Tesorería registra el monto de agua (Sedapal) y luz común.",
      detalle: `${nRecibos}/2`,
      estado: emitidoOCerrado || recibosListos ? "hecho" : "pendiente",
      href: `${base}#recibos`,
      cta: "Subir recibos",
    },
    {
      clave: "calcular",
      titulo: "Calcular cuotas",
      descripcion:
        "El sistema reparte el agua por consumo y arma la cuota de cada departamento.",
      detalle: d.cuotas === 10 ? "10/10" : null,
      estado: emitidoOCerrado || d.cuotas === 10 ? "hecho" : "pendiente",
      href: `${base}#calcular`,
      cta: "Calcular cuotas",
    },
    {
      clave: "emitir",
      titulo: "Emitir el periodo",
      descripcion:
        "Congela las cuotas y las publica. Desde ahí ya no se editan (las correcciones van al mes siguiente).",
      detalle: null,
      estado: emitidoOCerrado ? "hecho" : "pendiente",
      href: `${base}#emitir`,
      cta: "Revisar y emitir",
    },
    {
      clave: "pagos",
      titulo: "Cobranza",
      descripcion:
        "Registra cada pago con su comprobante; el semáforo se actualiza solo.",
      detalle: emitidoOCerrado ? `${d.cuotasPagadas}/10` : null,
      estado:
        p.estado === "cerrado" || (p.estado === "emitido" && d.cuotasPagadas === 10)
          ? "hecho"
          : p.estado === "emitido"
            ? "pendiente"
            : "bloqueado",
      href: `${base}#pagos`,
      cta: "Registrar pagos",
    },
    {
      clave: "cerrar",
      titulo: "Cerrar el mes",
      descripcion:
        "Cuadra la caja, fija el saldo final y abre el mes siguiente con el saldo arrastrado. Las cuotas impagas pasan como deuda.",
      detalle: null,
      estado:
        p.estado === "cerrado"
          ? "hecho"
          : p.estado === "emitido"
            ? "pendiente"
            : "bloqueado",
      href: `${base}#cerrar`,
      cta: "Cerrar mes",
    },
  ];

  // El paso "actual" es el primero pendiente (en orden).
  const primero = pasos.find((x) => x.estado === "pendiente");
  if (primero) primero.estado = "actual";
  return pasos;
}

// El paso que toca ahora (o null si el mes está al día).
export function pasoActual(pasos: Paso[]): Paso | null {
  return pasos.find((p) => p.estado === "actual") ?? null;
}
