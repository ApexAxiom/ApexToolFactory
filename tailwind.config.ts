import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f7f1",
        ink: "#17201d",
        moss: "#35524a",
        pine: "#173127",
        clay: "#c86b4a",
        gold: "#cf9b48",
        mist: "#dce6e1"
      },
      boxShadow: {
        panel: "0 18px 42px -24px rgba(23, 32, 29, 0.38)"
      },
      borderRadius: {
        "2xl": "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
