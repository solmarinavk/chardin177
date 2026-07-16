/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // exceljs es una librería de Node (streams/zip); no debe empaquetarse en el
  // bundle del servidor, se usa tal cual en los route handlers de exportación.
  experimental: {
    serverComponentsExternalPackages: ["exceljs"],
  },
};

export default nextConfig;
