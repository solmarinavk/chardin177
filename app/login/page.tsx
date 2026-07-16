"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError("Correo o contraseña incorrectos. Revisa e inténtalo de nuevo.");
      setCargando(false);
      return;
    }

    router.push("/inicio");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 px-5 py-10">
      <div className="w-full max-w-md">
        <div className="card animar-aparecer p-6 sm:p-8">
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
              177
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
              Chardin 177
            </h1>
            <p className="mt-1 text-slate-600">
              Entra con el correo y la contraseña que te dieron.
            </p>
          </div>

          <form onSubmit={ingresar} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="etiqueta">
                Correo
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="campo"
                placeholder="tucorreo@chardin177.pe"
              />
            </div>

            <div>
              <label htmlFor="password" className="etiqueta">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={verClave ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="campo pr-20"
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setVerClave((v) => !v)}
                  aria-pressed={verClave}
                  className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-sm font-semibold text-slate-500 hover:text-slate-900"
                >
                  {verClave ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={cargando} className="btn-primary w-full">
              {cargando ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          ¿Problemas para entrar? Escribe a la administración del edificio.
        </p>
        <p className="mt-2 text-center">
          <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            ← Volver a la portada
          </Link>
        </p>
      </div>
    </main>
  );
}
