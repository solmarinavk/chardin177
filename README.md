# Chardin 177 · Plataforma de Administración del Edificio

Plataforma 360 de administración, tesorería y transparencia para el edificio Chardin 177 (10 departamentos, Barranco, Lima). Reemplaza el Excel histórico con un sistema donde el portero registra lecturas de agua, el sistema calcula la cuota de cada departamento, y todos los vecinos ven en tiempo real quién pagó, en qué se gasta y cuánto hay en caja.

**Documentos clave:**
- `docs/PROPUESTA.md` → visión completa, reglas de negocio y arquitectura
- `CLAUDE.md` → reglas de desarrollo para Claude Code
- `ROADMAP.md` → fases y tareas
- `supabase/schema.sql` → esquema de datos, motor de cálculo y permisos
- `tests/fixtures/` → dos meses reales del edificio como casos de prueba dorados

## Cómo arrancar (paso a paso, una sola vez)

### 1. Crear el repo
```bash
# Crea el repo en GitHub (privado) llamado chardin177 y clónalo
git clone https://github.com/TU_USUARIO/chardin177.git
cd chardin177
# Copia todos los archivos de este kit a la raíz del repo
git add . && git commit -m "chore: kit inicial (propuesta, schema, roadmap, fixtures)" && git push
```

### 2. Crear el proyecto en Supabase
1. https://supabase.com → New project → nombre `chardin177`, región `South America (São Paulo)`.
2. En SQL Editor pega el contenido completo de `supabase/schema.sql` y ejecútalo.
3. En Authentication → Providers deja solo Email (magic link).
4. En Storage crea los buckets: `comprobantes`, `medidores`, `documentos` (privados).
5. Copia Project URL y anon key (Settings → API).

### 3. Variables de entorno
Crea `.env.local` (nunca lo commitees):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo para scripts de servidor
RESEND_API_KEY=...              # fase 3
```

### 4. Netlify
1. https://app.netlify.com → Add new site → Import from GitHub → `chardin177`.
2. Netlify detecta Next.js solo. Agrega las mismas variables de entorno en Site settings → Environment variables.
3. Cada push a `main` deploya; cada PR genera un deploy preview.

### 5. Arrancar con Claude Code
```bash
cd chardin177
claude
```
Primer prompt sugerido:
> Lee CLAUDE.md, docs/PROPUESTA.md y ROADMAP.md. Ejecuta la Fase 0 completa, tarea por tarea, marcando los checkboxes de ROADMAP.md a medida que termines. Confirma conmigo antes de cualquier decisión que se desvíe del roadmap.

Después de cada fase:
> Verifica la definición de "terminado" de CLAUDE.md para todo lo hecho en esta fase, corre los tests, y prepárame un resumen de lo construido antes de pasar a la Fase N+1.

## El flujo mensual (para quien administre)

1. **Portero** (día 1 a 5): ingresa las 10 lecturas de agua desde su celular.
2. **Tesorería** (cuando llegan los recibos): registra el monto de agua y luz.
3. **Tesorería**: revisa el borrador calculado y pulsa **Emitir**. Cada vecino recibe su cuota.
4. **Vecinos**: pagan; tesorería marca los pagos con comprobante. El semáforo se actualiza solo.
5. **Tesorería** (fin de mes): pulsa **Cerrar mes**. La caja cuadra y el saldo pasa al mes siguiente.

Menos de 30 minutos de trabajo humano al mes.
