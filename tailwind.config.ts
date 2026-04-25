import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f9fb",
        ink: "#0f1b2d",
        moss: "#2f6f64",
        pine: "#0f1b2d",
        emerald: "#0f8f72",
        clay: "#c86b4a",
        gold: "#cf9b48",
        mist: "#e7f3ef",
        line: "#dce5ee",
        muted: "#66758a"
      },
      boxShadow: {
        panel: "0 14px 36px -24px rgba(15, 27, 45, 0.35)",
        subtle: "0 1px 2px rgba(15, 27, 45, 0.05)"
      },
      borderRadius: {
        xl: "0.5rem",
        "2xl": "0.5rem"
      }
    }
  },
  plugins: []
};

export default config;
