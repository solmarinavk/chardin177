// Iconos propios (SVG inline, trazo 2, sin librerías). Todos heredan el color
// del texto (currentColor) y aceptan className para el tamaño.

type Props = { className?: string };

function Svg({
  className = "h-5 w-5",
  children,
}: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconoCasa(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </Svg>
  );
}

export function IconoGota(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 3s6 6.6 6 11a6 6 0 1 1-12 0c0-4.4 6-11 6-11Z" />
    </Svg>
  );
}

export function IconoCalendario(p: Props) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </Svg>
  );
}

export function IconoCuenta(p: Props) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </Svg>
  );
}

export function IconoRecibo(p: Props) {
  return (
    <Svg {...p}>
      <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </Svg>
  );
}

export function IconoUsuarios(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M16.5 4.8a3.5 3.5 0 0 1 0 6.4M21 20c0-2.5-1.9-4.3-4.5-4.9" />
    </Svg>
  );
}

export function IconoCheck(p: Props) {
  return (
    <Svg {...p}>
      <path d="m4.5 12.5 5 5L19.5 6.5" />
    </Svg>
  );
}

export function IconoAlerta(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9.5v4.5M12 17.2v.3" />
    </Svg>
  );
}

export function IconoCandado(p: Props) {
  return (
    <Svg {...p}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

export function IconoCamara(p: Props) {
  return (
    <Svg {...p}>
      <path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="14" r="3.5" />
    </Svg>
  );
}

export function IconoFlecha(p: Props) {
  return (
    <Svg {...p}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function IconoReloj(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

export function IconoSalir(p: Props) {
  return (
    <Svg {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Svg>
  );
}

// Mapa por nombre (para pasar iconos de servidor a cliente como string).
export const ICONOS: Record<string, (p: Props) => React.ReactElement> = {
  casa: IconoCasa,
  gota: IconoGota,
  calendario: IconoCalendario,
  cuenta: IconoCuenta,
  recibo: IconoRecibo,
  usuarios: IconoUsuarios,
  candado: IconoCandado,
};
