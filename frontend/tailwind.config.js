/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8edf5',
          100: '#c5d0e6',
          200: '#9eb1d4',
          300: '#7791c1',
          400: '#5979b3',
          500: '#3b61a5',
          600: '#35599d',
          700: '#2d4f93',
          800: '#264589',
          900: '#1e3a5f',
        },
      },
    },
  },
  plugins: [],
}
