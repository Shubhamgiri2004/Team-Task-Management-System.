/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1E40AF",
          dark: "#1b3695",
          light: "#dbeafe",
        },
        secondary: "#3B82F6",
        accent: "#F59E0B",
        neutral: "#F3F4F6",
        text: "#1F2937",
      },
    },
  },
  plugins: [],
};
