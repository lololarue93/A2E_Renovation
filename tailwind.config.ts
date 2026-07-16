import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./styles/**/*.css"],
  theme: {
    extend: {
      colors: {
        navy: "#051637",
        ink: "#14233f",
        champagne: "#b9aa8a",
        gold: "#c6b27a",
        silver: "#d8d9d6",
        pearl: "#faf8f3",
        mist: "#f3f5f8",
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
