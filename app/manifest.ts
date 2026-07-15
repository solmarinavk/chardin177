import type { MetadataRoute } from "next";

// Web App Manifest: hace la app instalable en la pantalla de inicio del
// celular (Android y iPhone) y la abre a pantalla completa, como app nativa.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chardin 177",
    short_name: "Chardin 177",
    description:
      "Administración, tesorería y transparencia del edificio Chardin 177 (Barranco, Lima).",
    lang: "es-PE",
    start_url: "/inicio",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f5f9",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Lecturas de agua",
        url: "/lecturas",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Periodos",
        url: "/periodos",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
