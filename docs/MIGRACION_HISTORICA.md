# Migración histórica (tarea 4.1) — cómo cargar el Excel

Carga los meses históricos del edificio (feb-2024 a jul-2026) como periodos
**cerrados**, con sus cuotas por depto y los saldos de caja arrastrados. **No se
recalcula con el motor**: es un volcado fiel del Excel ya auditado (la única
excepción documentada a "el motor calcula").

## La forma más simple para ti: generar un `.sql` y pegarlo

El script **solo lee el Excel y escribe un archivo `.sql`**. No toca la base de
datos. Tú revisas el SQL y lo pegas en Supabase. Cero riesgo, cero llaves.

### Pasos

1. Pon el archivo `Chardin_177_Historico.xlsx` en la raíz del proyecto (en tu compu).
2. En la terminal:
   ```bash
   npm install          # si no lo has hecho
   npm run migrar:excel -- ./Chardin_177_Historico.xlsx
   ```
3. Se crea **`historico_generado.sql`**. Ábrelo y échale un ojo (son puros
   `INSERT`, sin borrar nada).
4. El script te dice el **saldo final del último mes** (jul-2026). **Apúntalo.**
5. En Supabase → **SQL Editor → New query**, pega el contenido del `.sql` y
   **Run**. Es re-ejecutable: si lo corres dos veces no duplica (usa `on conflict`).
6. **Empalme:** el primer periodo operativo (el primer mes que administres con la
   plataforma, ej. ago-2026) debe **iniciar con ese saldo final**. Si ya lo
   creaste con otro saldo, el SQL **aborta solo** y te avisa (no carga a medias).
7. Sube el mismo Excel a **Documentos** (en la app) para dejarlo descargable.

> **¿Prefieres no tocar la terminal?** Mándame el `Chardin_177_Historico.xlsx` y
> yo corro el script y te entrego el `historico_generado.sql` listo para pegar.

## Si el script no encuentra una columna

Te muestra los encabezados que vió en cada hoja. Abre `scripts/migrar_excel.ts` y
ajusta la sección **CONFIG** (los alias de cada columna o el nombre de las hojas
`Cuotas`/`Caja`). Los montos del Excel van en **soles**; el script los pasa a
céntimos enteros solo.

## Qué carga exactamente

- **Periodos**: un mes por fila de la hoja `Caja`, en estado `cerrado`, con
  `saldo_inicial` y `saldo_final` tal cual (arrastrados sin saltos).
- **Cuotas**: una por depto por mes (hoja `Cuotas`), con el **total** que pagó
  cada uno. El desglose (agua/luz/vigilancia…) va en 0 porque históricamente solo
  se llevaba el total; el total sí es fiel.
- **Pagos**: uno por cuota, marcando cada mes como saldado y **contabilizado en su
  propio periodo**, para que la historia no se mezcle con la caja del primer mes
  operativo.

## Verificado

`lib/migracion.ts` (validación del empalme, cuadre de céntimos y generación del
SQL) está cubierto por `tests/migracion.test.ts`. Además, el SQL generado se
probó ejecutándolo contra un Postgres real (pglite) con el esquema completo:
periodos, cuotas y pagos entran sin romper llaves ni restricciones.
