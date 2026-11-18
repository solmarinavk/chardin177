// 6.11 · Revisión del borrador de cuotas antes de emitir. Lógica pura.
//
// Pasó de verdad (17/11/2026): las 10 lecturas de noviembre quedaron con la
// actual igual a la anterior (consumo 0). El motor hizo lo que manda la regla
// 8 (Σ Δm³ = 0 → agua en partes iguales) y se emitieron 10 cuotas idénticas de
// S/ 630.23 sin que nadie lo viera; el mensaje llegó al grupo antes de notarlo.
// La misma regla 8 manda ALERTAR, y eso faltaba. Esto lo cubre, y de paso
// detecta cuotas calculadas con datos que cambiaron después (lectura, recibo,
// derrama o ajuste), que hasta ahora se podían emitir sin recalcular.

export type CuotaRevisable = {
  dpto_id: number;
  m3_variacion: number;
  agua_consumo_cent: number;
  agua_comun_cent: number;
  luz_cent: number;
  extra_cent: number;
  ajuste_cent: number;
};

export type LecturaRevisable = {
  dpto_id: number;
  lectura_anterior: number;
  lectura_actual: number;
};

export type AjusteRevisable = {
  dpto_id: number;
  monto_cent: number;
  origen: string | null;
};

export type AvisoCuotas = {
  // "bloquea": no se emite hasta corregir. "avisa": se puede emitir, pero mira.
  nivel: "bloquea" | "avisa";
  texto: string;
};

// "101, 102 y 201"
export function listaDptos(dptos: number[]): string {
  const d = [...dptos].sort((a, b) => a - b);
  if (d.length <= 1) return d.join("");
  return `${d.slice(0, -1).join(", ")} y ${d[d.length - 1]}`;
}

// Consumo 0. Si TODAS las lecturas tienen 0 m³, bloquea: así nunca se vuelven
// a emitir 10 cuotas idénticas por error. Si solo algunas, avisa: un dpto
// vacío es posible, pero casi siempre es una lectura mal escrita.
export function avisoConsumo(
  cuotas: Pick<CuotaRevisable, "dpto_id" | "m3_variacion">[],
): AvisoCuotas | null {
  if (cuotas.length === 0) return null;
  const enCero = cuotas.filter((c) => c.m3_variacion === 0).map((c) => c.dpto_id);
  if (enCero.length === cuotas.length) {
    return {
      nivel: "bloquea",
      texto:
        "Las lecturas de agua tienen consumo 0 en todos los departamentos (la actual quedó igual a la anterior), así que el agua se repartió en partes iguales y todas las cuotas salen idénticas. Corrige la lectura ACTUAL de cada medidor en Lecturas de agua y vuelve a calcular antes de emitir.",
    };
  }
  if (enCero.length > 0) {
    const uno = enCero.length === 1;
    return {
      nivel: "avisa",
      texto: `${uno ? "El dpto" : "Los dptos"} ${listaDptos(enCero)} ${
        uno ? "tiene" : "tienen"
      } consumo 0 m³ este mes. Si no ${uno ? "está vacío" : "están vacíos"}, revisa ${
        uno ? "esa lectura" : "esas lecturas"
      } antes de emitir.`,
    };
  }
  return null;
}

export type ProblemaBorrador =
  | { tipo: "recalcular"; texto: string; motivos: string[] }
  | { tipo: "consumo"; texto: string }
  | null;

// Qué impide emitir, en orden de prioridad. PRIMERO si el borrador quedó
// desactualizado (hay que recalcular): es exactamente lo que pasa justo
// después de corregir las lecturas, y ahí decir "consumo 0" confunde (pasó
// el 18/11: Mamita corrigió las 10 lecturas y la pantalla seguía en rojo).
// Recién después, el consumo 0 del borrador vigente.
export function problemaDelBorrador(
  cuotas: CuotaRevisable[],
  lecturas: LecturaRevisable[],
  recibos: { aguaCent: number | null; luzCent: number | null },
  ajustes: AjusteRevisable[],
): ProblemaBorrador {
  const motivos = motivosRecalcular(cuotas, lecturas, recibos, ajustes);
  if (motivos.length > 0) {
    return {
      tipo: "recalcular",
      motivos,
      texto: `Hay datos que cambiaron después de calcular: ${motivos.join(", ")}. Pulsa «Recalcular cuotas» y vuelve a emitir.`,
    };
  }
  const aviso = avisoConsumo(cuotas);
  if (aviso?.nivel === "bloquea") return { tipo: "consumo", texto: aviso.texto };
  return null;
}

// Cuotas calculadas con datos que después cambiaron. Compara el borrador
// contra las lecturas, los recibos y los ajustes de HOY y devuelve los
// motivos (vacío = todo al día). Si hay alguno, toca recalcular antes de emitir.
export function motivosRecalcular(
  cuotas: CuotaRevisable[],
  lecturas: LecturaRevisable[],
  recibos: { aguaCent: number | null; luzCent: number | null },
  ajustes: AjusteRevisable[],
): string[] {
  if (cuotas.length === 0) return [];
  const motivos: string[] = [];

  // Lecturas: el consumo guardado en la cuota debe ser el de la lectura actual.
  const consumo = new Map(
    lecturas.map((l) => [l.dpto_id, l.lectura_actual - l.lectura_anterior]),
  );
  const cambiaron = cuotas
    .filter((c) => consumo.get(c.dpto_id) !== c.m3_variacion)
    .map((c) => c.dpto_id);
  if (cambiaron.length > 0)
    motivos.push(`las lecturas de agua cambiaron (dpto ${listaDptos(cambiaron)})`);

  // Recibos: Σ agua y Σ luz de las cuotas cuadran exacto con el recibo (motor).
  const sumAgua = cuotas.reduce((a, c) => a + c.agua_consumo_cent + c.agua_comun_cent, 0);
  const sumLuz = cuotas.reduce((a, c) => a + c.luz_cent, 0);
  if (recibos.aguaCent === null) motivos.push("falta el recibo de agua");
  else if (sumAgua !== recibos.aguaCent) motivos.push("el recibo de agua cambió");
  if (recibos.luzCent === null) motivos.push("falta el recibo de luz");
  else if (sumLuz !== recibos.luzCent) motivos.push("el recibo de luz cambió");

  // Derramas (origen cuota_extra) y demás ajustes, por dpto.
  const extras = new Map<number, number>();
  const otros = new Map<number, number>();
  for (const a of ajustes) {
    const m = a.origen === "cuota_extra" ? extras : otros;
    m.set(a.dpto_id, (m.get(a.dpto_id) ?? 0) + a.monto_cent);
  }
  if (cuotas.some((c) => (extras.get(c.dpto_id) ?? 0) !== c.extra_cent))
    motivos.push("la derrama cambió");
  if (cuotas.some((c) => (otros.get(c.dpto_id) ?? 0) !== c.ajuste_cent))
    motivos.push("los ajustes cambiaron");

  return motivos;
}
