import type { Config } from "tailwindcss";

// Mobile first: el portero y los vecinos usan celular. Diseñamos primero a 380px.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semáforo de pagos (accesible, buen contraste)
        semaforo: {
          verde: "#15803d", // pagado
          ambar: "#b45309", // parcial
          rojo: "#b91c1c", // pendiente
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
