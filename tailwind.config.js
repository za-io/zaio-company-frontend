/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        zaio: {
          blue: "#2B2ECF",
          "blue-lift": "#5A5DE8",
          black: "#121212",
          ink: "#2A2A2A",
          white: "#F5F5F5",
          mint: "#7ED957",
          sand: "#F2B766",
          violet: "#7A6CF6",
        },
      },
      borderRadius: {
        lg: "0.625rem",
      },
      keyframes: {
        "late-nav-blink": {
          "0%, 40%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(251, 146, 60, 0.95)",
            backgroundColor: "rgb(217 119 6)",
            color: "#fff",
          },
          "50%, 90%": {
            opacity: "1",
            boxShadow: "0 0 22px 8px rgba(251, 146, 60, 1)",
            backgroundColor: "rgb(254 243 199)",
            color: "rgb(127 29 29)",
          },
          "100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(251, 146, 60, 0.95)",
            backgroundColor: "rgb(217 119 6)",
            color: "#fff",
          },
        },
        "late-badge-pulse": {
          "0%, 45%": { transform: "scale(1)", opacity: "1" },
          "50%, 95%": { transform: "scale(1.35)", opacity: "0.2" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "late-nav-blink": "late-nav-blink 0.65s linear infinite",
        "late-badge-pulse": "late-badge-pulse 0.65s linear infinite",
      },
    },
  },
  plugins: [],
};
