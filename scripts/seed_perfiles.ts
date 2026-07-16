/**
 * Seed de la tabla `perfiles` para los 4 usuarios fijos del edificio.
 *
 * Qué hace: busca en Supabase Auth el usuario de cada correo (por su email) y
 * crea/actualiza su fila en `perfiles` con el rol correspondiente.
 *
 * Cómo se corre (SOLO en tu compu, nunca en el navegador):
 *   1) Ten el archivo .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *   2) Crea antes los 4 usuarios en Supabase → Authentication → Users (Auto Confirm).
 *   3) Ejecuta:  npm run seed:perfiles
 *
 * Si tus correos son distintos a los de ejemplo, cámbialos abajo en USUARIOS
 * o pásalos por variables de entorno (SEED_ADMIN_EMAIL, etc.).
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import type { Database, RolUsuario } from "../lib/database.types";

// Carga .env.local
loadEnv({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    "\n❌ Faltan llaves. Revisa que .env.local tenga NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.\n",
  );
  process.exit(1);
}

type UsuarioSeed = {
  email: string;
  nombre: string;
  rol: RolUsuario;
};

// Los 3 usuarios que ESCRIBEN (con login). Los vecinos ya no tienen cuenta:
// ven la transparencia en la web pública /transparencia. Cambia los correos
// si creaste otros.
const USUARIOS: UsuarioSeed[] = [
  {
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@chardin177.pe",
    nombre: "Administración (Presidencia)",
    rol: "admin",
  },
  {
    email: process.env.SEED_TESORERIA_EMAIL ?? "tesoreria@chardin177.pe",
    nombre: "Tesorería",
    rol: "tesoreria",
  },
  {
    email: process.env.SEED_PORTERIA_EMAIL ?? "porteria@chardin177.pe",
    nombre: "Portería",
    rol: "porteria",
  },
];

const admin = createClient<Database>(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Busca el user_id de un correo en Supabase Auth (paginando por si acaso).
async function buscarUserIdPorEmail(email: string): Promise<string | null> {
  const objetivo = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const encontrado = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === objetivo,
    );
    if (encontrado) return encontrado.id;
    if (data.users.length < perPage) return null; // no hay más páginas
    page += 1;
  }
}

async function main() {
  console.log("\n🌱 Sembrando perfiles de Chardin 177…\n");
  let ok = 0;
  let faltantes = 0;

  for (const u of USUARIOS) {
    const userId = await buscarUserIdPorEmail(u.email);
    if (!userId) {
      console.warn(
        `⚠️  ${u.email} → NO existe en Supabase Auth. Créalo primero (Authentication → Users → Add user, Auto Confirm).`,
      );
      faltantes += 1;
      continue;
    }

    const { error } = await admin.from("perfiles").upsert(
      {
        user_id: userId,
        nombre: u.nombre,
        rol: u.rol,
        dpto_id: null,
        activo: true,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error(`❌ ${u.email} (${u.rol}) → error al guardar: ${error.message}`);
      faltantes += 1;
      continue;
    }

    console.log(`✅ ${u.email} → rol "${u.rol}" (${userId})`);
    ok += 1;
  }

  console.log(`\nListo: ${ok} perfil(es) sembrado(s), ${faltantes} con problema.\n`);
  if (faltantes > 0) process.exit(1);
}

main().catch((e) => {
  console.error("\n❌ Error inesperado:", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
