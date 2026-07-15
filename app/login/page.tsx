"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Chardin 177
        </Link>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Ingresar</h1>
        <p className="mt-2 text-slate-600">
          Entra con el correo y la contraseña que te dieron.
        </p>
      </div>

      <form onSubmit={ingresar} className="flex flex-col gap-5">
        <div>
          <label htmlFor="email" className="etiqueta">
            Correo
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
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
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="campo"
            placeholder="Tu contraseña"
          />
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

      <p className="text-center text-sm text-slate-400">
        ¿Problemas para entrar? Escribe a la administración del edificio.
      </p>
    </main>
  );
}
