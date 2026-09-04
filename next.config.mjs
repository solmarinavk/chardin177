/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // exceljs es una librería de Node (streams/zip); no debe empaquetarse en el
  // bundle del servidor, se usa tal cual en los route handlers de exportación.
  experimental: {
    serverComponentsExternalPackages: ["exceljs"],
    serverActions: {
      // Las fotos de evidencia (cuaderno del portero, medidores, comprobantes)
      // viajan por Server Actions. El límite por defecto es 1 MB y una foto de
      // celular pesa 3–5 MB: el formulario reventaba con "Application error".
      // Se suben comprimidas desde el navegador (lib/imagenes.ts); esto es solo
      // la red de seguridad. No subir más: Netlify corta la petición ~6 MB.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
