import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Chardin 177",
    template: "%s · Chardin 177",
  },
  description:
    "Plataforma de administración, tesorería y transparencia del edificio Chardin 177 (Barranco, Lima).",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // Instalada en iPhone: pantalla completa con el nombre correcto.
  appleWebApp: {
    capable: true,
    title: "Chardin 177",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  // Necesario para respetar las zonas seguras del iPhone (notch/barra inferior).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-PE">
      <body>{children}</body>
    </html>
  );
}
