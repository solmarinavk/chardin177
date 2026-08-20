// Categorías del cuaderno de ocurrencias. Módulo SIN dependencias de servidor:
// lo importan tanto el formulario (cliente) como la capa de datos (servidor),
// así el componente cliente nunca arrastra el cliente de Supabase del servidor.
export const CATEGORIAS_OCURRENCIA = [
  { valor: "mantenimiento", etiqueta: "Mantenimiento" },
  { valor: "incidente", etiqueta: "Incidente / avería" },
  { valor: "limpieza", etiqueta: "Limpieza" },
  { valor: "seguridad", etiqueta: "Seguridad" },
  { valor: "entrega", etiqueta: "Entrega / paquete" },
  { valor: "visita", etiqueta: "Visita / proveedor" },
  { valor: "general", etiqueta: "Otro" },
] as const;

export function etiquetaCategoria(valor: string): string {
  return CATEGORIAS_OCURRENCIA.find((c) => c.valor === valor)?.etiqueta ?? "Otro";
}

export function esCategoriaValida(valor: string): boolean {
  return CATEGORIAS_OCURRENCIA.some((c) => c.valor === valor);
}
