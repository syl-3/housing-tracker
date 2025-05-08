/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        flap: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '30%': { transform: 'rotate(-10deg) scaleY(1.1)' },
          '60%': { transform: 'rotate(10deg) scaleY(0.95)' },
          '100%': { transform: 'rotate(0deg) scale(1)' },
        },
      },
      animation: {
        flap: 'flap 0.4s ease',
      },
    },
  },
  plugins: [],
};
