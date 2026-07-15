# GUÍA PASO A PASO · Chardin 177
### De cero a plataforma funcionando. Sigue los pasos en orden, sin saltarte ninguno.

---

## ANTES DE EMPEZAR: entiende las 3 piezas

| Pieza | Qué es | Para qué |
|---|---|---|
| **GitHub** | Donde vive el código | Claude Code escribe el código ahí |
| **Supabase** | La base de datos en la nube (gratis) | Donde se guardan pagos, lecturas, gastos. Es el "Excel en la nube" compartido |
| **Netlify** | Donde vive la página web (gratis) | La dirección web que abrirán los vecinos |

Los archivos del kit (CLAUDE.md, ROADMAP.md, etc.) son las **instrucciones que Claude Code va a leer** para construir todo. Tú no los editas, solo los pones en el repositorio.

---

## PASO 1 · Crear el repositorio en GitHub (5 min)

1. Entra a https://github.com → botón verde **New** (nuevo repositorio).
2. Nombre: `chardin177`. Marca **Private**. NO marques "Add README". Botón **Create repository**.
3. Descomprime el `chardin177_kit.zip` en tu compu. Verás una carpeta `chardin177` con esto adentro:

```
chardin177/
├── CLAUDE.md            ← reglas que Claude Code obedece
├── README.md            ← portada del repo
├── ROADMAP.md           ← lista de tareas por fases
├── docs/
│   └── PROPUESTA.md     ← toda la lógica del edificio
├── supabase/
│   └── schema.sql       ← la base de datos (lo usarás en el Paso 2)
└── tests/
    └── fixtures/
        ├── junio_2026.json   ← datos reales para verificar cálculos
        └── julio_2026.json
```

4. Sube estos archivos al repo. La forma fácil desde la web: en tu repo vacío, GitHub te muestra el link **"uploading an existing file"**. Haz clic, arrastra TODO el contenido de la carpeta (las subcarpetas se arrastran junto), escribe "kit inicial" y **Commit changes**.

✅ Verificación: en github.com/TU_USUARIO/chardin177 ves los archivos y carpetas de arriba.

---

## PASO 2 · Crear la base de datos en Supabase (10 min)

1. Entra a https://supabase.com → **Start your project** → crea cuenta con tu GitHub.
2. **New project**: nombre `chardin177`, contraseña de base de datos (guárdala en tu gestor de claves), región **South America (São Paulo)**. Crear y esperar ~2 min.
3. En el menú izquierdo: **SQL Editor** → **New query**. Abre el archivo `supabase/schema.sql` del kit en tu compu (con cualquier editor de texto), copia TODO su contenido, pégalo y pulsa **Run**. Debe decir "Success". Esto crea las 17 tablas, el motor de cálculo y los permisos, todo de golpe.
4. Crear las 4 cuentas fijas. Menú **Authentication** → **Users** → **Add user** → **Create new user**. Crea estas cuatro (usa correos reales o inventados tipo `admin@chardin177.pe`, y contraseñas fuertes; marca **Auto Confirm User** en cada una):

| Correo (ejemplo) | Contraseña | Será el rol |
|---|---|---|
| admin@chardin177.pe | (elige una) | admin (presidencia) |
| tesoreria@chardin177.pe | (elige una) | tesoreria |
| porteria@chardin177.pe | (simple, la usará el portero) | porteria |
| vecinos@chardin177.pe | (se comparte a todo el edificio) | residente (solo lectura) |

Apunta los 4 correos y claves: se las darás a Claude Code en el prompt maestro y luego a cada persona.

5. Desactivar el registro público: **Authentication** → **Sign In / Up** → apaga **Allow new users to sign up**. Así NADIE puede crearse cuentas, solo existen las 4.
6. Crear las carpetas de fotos: menú **Storage** → **New bucket** → crea tres, todos privados: `comprobantes`, `medidores`, `documentos`.
7. Copiar las llaves: menú **Settings** (engranaje) → **API**. Copia y guarda en un archivo de notas:
   - **Project URL** (algo como https://xxxx.supabase.co)
   - **anon public** key
   - **service_role** key (esta es secreta, no la compartas nunca)

✅ Verificación: en **Table Editor** ves la tabla `departamentos` con 10 filas (101 al 502).

---

## PASO 3 · Preparar tu compu (10 min, solo la primera vez)

Necesitas Git, Node.js y Claude Code instalados. En la terminal:

```bash
# verifica si ya los tienes:
git --version
node --version        # necesitas 18 o superior
claude --version

# si te falta Claude Code:
npm install -g @anthropic-ai/claude-code
```

Luego clona tu repo y entra a la carpeta:

```bash
git clone https://github.com/TU_USUARIO/chardin177.git
cd chardin177
```

Crea el archivo de llaves secretas. Dentro de la carpeta del repo, crea un archivo llamado exactamente `.env.local` (con el punto al inicio) con esto, usando las llaves que copiaste en el Paso 2.7:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...la_anon...
SUPABASE_SERVICE_ROLE_KEY=eyJ...la_service_role...
```

Este archivo NUNCA se sube a GitHub (Claude Code configurará el .gitignore para protegerlo).

---

## PASO 4 · Soltar a Claude Code con el PROMPT MAESTRO

En la terminal, dentro de la carpeta del repo:

```bash
claude
```

Y pega el prompt maestro completo (está al final de esta guía, en el recuadro). Reemplaza los 4 correos por los que creaste en el Paso 2.4 antes de pegar.

**Cómo trabajar con Claude Code a partir de ahí:**
- Claude construye fase por fase y al final de cada una se detiene y te dice cómo probar lo que hizo.
- Tú pruebas (abrir la página, entrar con una cuenta, etc.). Si todo bien, escribes: `continúa con la siguiente fase`.
- Si algo falla, cuéntale qué viste ("al entrar como portería me sale error X") y él lo arregla.
- Si cierras la terminal, no pasa nada: vuelves a la carpeta, escribes `claude` de nuevo y le dices `lee ROADMAP.md y continúa donde quedaste`.

---

## PASO 5 · Publicar en Netlify (5 min, se hace cuando la Fase 0 esté lista)

1. https://app.netlify.com → crea cuenta con GitHub → **Add new project** → **Import an existing project** → elige `chardin177`.
2. Netlify detecta Next.js solo. Antes de deployar: **Site configuration** → **Environment variables** → **Add a variable** y agrega las 3 llaves de tu `.env.local` (mismos nombres, mismos valores).
3. **Deploy**. Netlify te da una dirección tipo `chardin177.netlify.app`. Esa es la web del edificio.
4. Desde ahora, cada vez que Claude Code hace commit y push, la web se actualiza sola en 1 o 2 minutos.

---

## PASO 6 · Puesta en marcha real (cuando la Fase 1 esté lista)

1. Entra como admin y verifica que los nombres de los 10 departamentos y residentes estén bien.
2. Dale al portero el correo y clave de portería, y muéstrale la pantalla de lecturas (son 10 casillas).
3. Comparte la cuenta `vecinos@` en el grupo de WhatsApp del edificio.
4. Primer mes: portero ingresa lecturas → tesorería sube monto de recibos → botón Emitir → registrar pagos → botón Cerrar mes. Listo.

---
---

## 🟦 EL PROMPT MAESTRO (copia desde aquí hasta el final)

```
Lee completamente CLAUDE.md, docs/PROPUESTA.md y ROADMAP.md antes de escribir una sola línea de código. Son las reglas de este proyecto y tienen prioridad sobre cualquier otra costumbre tuya.

CONTEXTO: vas a construir la plataforma de administración del edificio Chardin 177 descrita en docs/PROPUESTA.md. La base de datos ya existe: apliqué supabase/schema.sql en un proyecto de Supabase y las llaves están en .env.local (verifica que exista; si no, detente y pídemelas). Los buckets de Storage comprobantes, medidores y documentos ya están creados.

CAMBIO IMPORTANTE respecto a CLAUDE.md sección de Auth: NO usaremos magic links ni registro público. La autenticación es con email y contraseña fijos. Ya creé estos 4 usuarios en Supabase Auth (el registro público está desactivado):

- admin@chardin177.pe → rol admin
- tesoreria@chardin177.pe → rol tesoreria
- porteria@chardin177.pe → rol porteria
- vecinos@chardin177.pe → rol residente (cuenta compartida de solo lectura para todos los vecinos)

En la Fase 0, en lugar de la tarea 0.4 de magic link: haz una página de login simple con email y contraseña (signInWithPassword de Supabase), y crea un script de seed (scripts/seed_perfiles.ts, ejecutado con la service role key SOLO en local) que inserte en la tabla perfiles la fila de cada uno de esos 4 usuarios con su rol correspondiente, buscando su user_id por email. La página de login debe ser muy simple y en español, con botones grandes (la usarán personas mayores desde el celular).

FORMA DE TRABAJO:
1. Ejecuta el ROADMAP.md fase por fase, tarea por tarea, en orden. Marca cada checkbox del ROADMAP.md al completarla y haz un commit por tarea con mensaje convencional.
2. Al terminar cada FASE: detente, corre los tests, y dame un resumen en español simple de qué construiste y CÓMO LO PRUEBO YO paso a paso (qué URL abrir, con qué cuenta entrar, qué debería ver). No continúes a la siguiente fase hasta que yo escriba "continúa".
3. Los tests dorados de tests/fixtures/ son sagrados: el motor de cálculo debe reproducirlos según la tolerancia definida en CLAUDE.md. Si no cuadran, el error está en tu código.
4. Respeta a rajatabla: dinero en céntimos enteros, RLS verificado en cada tabla que toques, periodos emitidos inmutables, bitácora de auditoría, mobile first a 380px, todo el texto de la interfaz en español peruano (S/, dd/mm/yyyy, zona America/Lima).
5. Si una decisión no está cubierta por CLAUDE.md, PROPUESTA.md o ROADMAP.md, pregúntame antes de decidir por tu cuenta. Explícame siempre en lenguaje simple, sin jerga, porque quien administre esto no es programador.
6. Cuando la Fase 0 esté lista, recuérdame publicar en Netlify (Paso 5 de la guía) y dime exactamente qué verificar en el deploy.

EMPIEZA AHORA: confirma que leíste los 3 documentos resumiéndome en 5 líneas qué vas a construir y cuáles son las 3 reglas más importantes que vas a respetar. Luego arranca con la Fase 0.
```
