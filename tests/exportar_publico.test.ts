import { describe, it, expect } from "vitest";
import {
  armarHojas,
  TIPOS_DATO,
  TIPOS_DATO_PUBLICO,
} from "@/lib/exportar_datos";
import type { ClienteDatos } from "@/lib/caja";

// 5.2 · Test de NO-FILTRACIÓN del export público: se espía qué tablas consulta
// el armado de hojas y se verifica que SOLO toca tablas de transparencia.
// (La otra capa de defensa —RLS anon— se prueba en tests/rls.test.ts.)

const TABLAS_TRANSPARENCIA = new Set([
  "periodos",
  "cuotas",
  "pagos",
  "egresos",
  "categorias_egreso",
  "lecturas_agua",
]);

const TABLAS_PROHIBIDAS = ["perfiles", "residentes", "audit_log", "constancias_pago"];

// Cliente falso: registra cada tabla consultada y devuelve filas de utilería
// para que todos los armadores de hojas recorran su camino completo.
function clienteEspia(): { cliente: ClienteDatos; tablas: string[] } {
  const filas: Record<string, unknown[]> = {
    periodos: [
      { id: 1, anio: 2026, mes: 6, estado: "cerrado", saldo_inicial_cent: 0, saldo_final_cent: 100 },
      { id: 2, anio: 2026, mes: 7, estado: "emitido", saldo_inicial_cent: 100, saldo_final_cent: null },
    ],
    cuotas: [
      { id: 1, dpto_id: 101, periodo_id: 1, total_cent: 45000, estado: "pagado", m3_variacion: 3 },
    ],
    pagos: [
      { cuota_id: 1, monto_cent: 45000, fecha_pago: "2026-06-30", medio: "yape", nota: null },
    ],
    categorias_egreso: [{ id: 1, nombre: "Agua" }],
    egresos: [
      { periodo_id: 1, fecha: "2026-06-10", categoria_id: 1, concepto: "Sedapal", monto_cent: 46170, pagado: true },
    ],
    lecturas_agua: [
      { periodo_id: 1, dpto_id: 101, lectura_anterior: 120, lectura_actual: 123 },
    ],
  };

  const tablas: string[] = [];
  const cliente = {
    from(tabla: string) {
      tablas.push(tabla);
      const rows = filas[tabla] ?? [];
      // Builder encadenable y "thenable": cualquier método devuelve el builder
      // y al hacerle await resuelve { data }.
      const builder: Record<string, unknown> = {
        then(resolve: (v: { data: unknown[] }) => void) {
          resolve({ data: rows });
        },
      };
      for (const m of ["select", "in", "order", "eq", "neq", "gte", "lte", "is", "limit", "maybeSingle"]) {
        builder[m] = () => builder;
      }
      return builder;
    },
  };
  return { cliente: cliente as unknown as ClienteDatos, tablas };
}

describe("export público (5.2): no filtra datos personales", () => {
  it("la lista pública ofrece exactamente cuotas, pagos, egresos, caja y consumo", () => {
    expect([...TIPOS_DATO_PUBLICO].sort()).toEqual(
      ["caja", "consumo", "cuotas", "egresos", "pagos"].sort(),
    );
  });

  it("con los tipos públicos SOLO consulta tablas de transparencia", async () => {
    const { cliente, tablas } = clienteEspia();
    const hojas = await armarHojas({ datos: TIPOS_DATO_PUBLICO }, cliente);

    expect(hojas.length).toBeGreaterThan(0); // sí exporta contenido
    const usadas = [...new Set(tablas)];
    for (const t of usadas) expect(TABLAS_TRANSPARENCIA.has(t)).toBe(true);
    for (const prohibida of TABLAS_PROHIBIDAS) {
      expect(usadas).not.toContain(prohibida);
    }
  });

  it("incluso con TODOS los tipos (los del export interno) jamás toca perfiles/residentes/bitácora/constancias", async () => {
    const { cliente, tablas } = clienteEspia();
    await armarHojas({ datos: TIPOS_DATO.map((t) => t.clave) }, cliente);
    for (const prohibida of TABLAS_PROHIBIDAS) {
      expect(tablas).not.toContain(prohibida);
    }
  });

  it("las hojas públicas no llevan columnas de personas (nombre, email, teléfono, usuario)", async () => {
    const { cliente } = clienteEspia();
    const hojas = await armarHojas({ datos: TIPOS_DATO_PUBLICO }, cliente);
    const columnas = hojas.flatMap((h) => h.columnas.map((c) => c.clave.toLowerCase()));
    for (const sensible of ["nombre", "email", "telefono", "usuario", "registrado_por", "creado_por"]) {
      expect(columnas).not.toContain(sensible);
    }
  });
});
