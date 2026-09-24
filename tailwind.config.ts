import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1F3D",
        navy: "#10284D",
        muted: "#557393",
        blue: {
          DEFAULT: "#38B2D1",
          bright: "#43c5e6",
          dark: "#436D75",
          light: "#C4EBF2",
        },
        ice: "#F0FAFC",
        line: "#C4EBF2"
      },
      fontFamily: {
        sans: ["'Neue Montreal'", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
        cursive: ["'Caveat'", "cursive"],
      },
      boxShadow: {
        soft: "0 20px 54px rgba(56, 178, 209, 0.08)",
        card: "0 14px 34px rgba(56, 178, 209, 0.09)",
        button: "0 10px 25px rgba(56, 178, 209, 0.35)",
        floating: "0 20px 40px rgba(56, 178, 209, 0.12)",
      },
      backgroundImage: {
        "blue-gradient": "linear-gradient(135deg, #43c5e6 0%, #38B2D1 50%, #436D75 100%)",
        "btn-gradient": "linear-gradient(90deg, #38B2D1 0%, #2ca0be 50%, #436D75 100%)",
        "ice-soft": "linear-gradient(135deg, #FFFFFF 0%, #F5FCFD 48%, #C4EBF2 100%)",
        "ice-card": "linear-gradient(145deg, #FFFFFF 0%, #F5FCFD 58%, #C4EBF2 100%)"
      }
    }
  },
  plugins: []
};
export default config;

