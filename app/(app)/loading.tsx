// Esqueleto de carga para toda la zona autenticada: la app se siente viva
// mientras el servidor arma la página.
export default function Loading() {
  return (
    <main className="flex flex-col gap-5" aria-busy>
      <div className="h-8 w-2/3 animate-pulse rounded-xl bg-slate-200" />
      <div className="card h-44 animate-pulse border-none bg-slate-200/70" />
      <div className="card h-64 animate-pulse border-none bg-slate-200/50" />
      <div className="grid grid-cols-2 gap-3">
        <div className="card h-20 animate-pulse border-none bg-slate-200/50" />
        <div className="card h-20 animate-pulse border-none bg-slate-200/50" />
      </div>
    </main>
  );
}
