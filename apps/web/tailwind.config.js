/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FBF9F4',
          100: '#F6F3EC',
          200: '#EEEAE0',
          300: '#E4DFD3',
          400: '#CBC4B4',
          500: '#A9A18E'
        },
        ink: {
          900: '#141713',
          800: '#222620',
          700: '#383D35',
          600: '#525A4E',
          500: '#737C6F'
        },
        forest: {
          900: '#07241A',
          800: '#0D382A',
          700: '#165B43',
          600: '#207F5E',
          500: '#2CA67D'
        },
        gold: {
          DEFAULT: '#C59B27',
          light: '#E5C158',
          dark: '#9A7514'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Menlo', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
