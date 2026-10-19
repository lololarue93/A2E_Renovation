import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./styles/**/*.css"],
  theme: {
    extend: {
      colors: {
        navy: "#142e32",
        ink: "#273d40",
        champagne: "#a28a60",
        gold: "#c6b27a",
        silver: "#d8d9d6",
        pearl: "#f5f3ec",
        mist: "#edf2ee",
        success: "#2d6a4f"
      },
      boxShadow: {
        premium: "0 22px 64px rgba(5, 22, 55, 0.12)"
      },
      borderRadius: {
        card: "8px"
      }
    }
  },
  plugins: []
};

export default config;
