import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                obsidian: {
                    DEFAULT: '#020408',
                    surface: 'rgba(15, 23, 42, 0.6)', // Slate 900 @ 60%
                },
                cyan: {
                    neural: '#00F2FF',
                },
                neural: {
                    900: "#050510", // Keep for legacy until refactor complete
                    800: "#0A0A1F",
                    700: "#141432",
                    500: "#3B82F6",
                    300: "#93C5FD",
                    100: "#E0F2FE",
                },
                crimson: {
                    500: "#EF4444",
                    900: "#450A0A",
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "obsidian-radial": "radial-gradient(circle at center, #0B111D 0%, #020408 100%)",
            },
            boxShadow: {
                "neural": "0 20px 50px rgba(0, 0, 0, 0.8)",
                "glow": "0 0 20px rgba(0, 242, 255, 0.2)",
            },
            animation: {
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "float": "float 6s ease-in-out infinite",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-20px)" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
